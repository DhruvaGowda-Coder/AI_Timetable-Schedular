import { NextResponse } from "next/server";
import { z } from "zod";
import { generateTimetableVariantsGA } from "@/lib/scheduler/genetic-algorithm";
import { saveGeneratedVariants } from "@/lib/server-store";
import { resolveUserIdFromApiKey } from "@/lib/api-keys";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import {
  clampVariantCountForPlan,
  getUserBillingSummary,
} from "@/lib/subscription";
import {
  getSystemUserId,
  getCurrentWorkspaceId,
} from "@/lib/system-user";
import {
  MAX_SLOTS_PER_DAY,
  TIME_PATTERN,
  timeStringToMinutes,
} from "@/lib/scheduler-utils";

const subjectSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required."),
  weeklyHours: z.number().int().min(1).max(8),
  maxPerDay: z.number().int().min(1).max(6).optional(),
});

const facultySchema = z.object({
  name: z.string().trim().min(1, "Faculty name is required."),
  canTeach: z.array(z.string()).default([]),
  unavailableDays: z.array(z.string()).default([]),
});

const roomSchema = z.object({
  name: z.string().trim().min(1, "Room name is required."),
  capacity: z.number().int().min(1),
});

const slotTimingSchema = z.object({
  start: z.string().regex(TIME_PATTERN),
  end: z.string().regex(TIME_PATTERN),
});

const constraintsSchema = z
  .object({
    days: z.array(z.string()).min(1),
    slotsPerDay: z.number().int().min(1).max(MAX_SLOTS_PER_DAY),
    slotTimings: z.array(slotTimingSchema).min(1).max(MAX_SLOTS_PER_DAY),
    subjects: z.array(subjectSchema).min(1),
    faculties: z.array(facultySchema).min(1),
    rooms: z.array(roomSchema).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.slotTimings.length !== value.slotsPerDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Slot timings must match slots per day.",
        path: ["slotTimings"],
      });
      return;
    }

    const labels = new Set<string>();
    let previousEnd = -1;
    value.slotTimings.forEach((slotTiming, index) => {
      const start = timeStringToMinutes(slotTiming.start);
      const end = timeStringToMinutes(slotTiming.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each slot must have a valid start and end time.",
          path: ["slotTimings", index],
        });
      }

      const label = `${slotTiming.start}-${slotTiming.end}`;
      if (labels.has(label)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate slot timings are not allowed.",
          path: ["slotTimings", index],
        });
      }
      labels.add(label);

      if (previousEnd >= 0 && start < previousEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Periods must be in increasing order without overlap.",
          path: ["slotTimings", index],
        });
      }
      previousEnd = end;
    });

    value.subjects.forEach((subject, index) => {
      const maxPerDay = subject.maxPerDay ?? 2;
      const weeklyLimit = value.days.length * maxPerDay;
      if (subject.weeklyHours > weeklyLimit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Weekly hours exceed distribution limit (${weeklyLimit}) for this subject.`,
          path: ["subjects", index, "weeklyHours"],
        });
      }
    });

    value.faculties.forEach((faculty, index) => {
      const invalidDay = (faculty.unavailableDays ?? []).find(
        (day) => !value.days.includes(day)
      );
      if (invalidDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unavailable day "${invalidDay}" is not part of selected teaching days.`,
          path: ["faculties", index, "unavailableDays"],
        });
      }
    });
  });

const generateSchema = z.object({
  constraints: constraintsSchema,
  count: z.number().int().min(1).optional(),
});

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function POST(request: Request) {
  try {
    let userId = useDatabase ? await getSystemUserId() : null;
    const apiKey = request.headers.get("x-api-key")?.trim() ?? "";
    const hasApiKey = apiKey.length > 0;

    if (hasApiKey && useDatabase) {
      const resolvedByApiKey = await resolveUserIdFromApiKey(apiKey);
      if (!resolvedByApiKey) {
        return NextResponse.json({ message: "Invalid API key." }, { status: 401 });
      }
      userId = resolvedByApiKey;
    }

    const payload = await request.json().catch(() => null);
    const parsed = generateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid constraints payload.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const billingSummary = await getUserBillingSummary(userId);
    if (hasApiKey && billingSummary.currentPlan !== "institution") {
      return NextResponse.json(
        { message: "API key access requires an active Institution subscription." },
        { status: 403 }
      );
    }

    const requestedCountFromClient = parsed.data.count ?? 3;
    const variantCountDecision = clampVariantCountForPlan(
      requestedCountFromClient,
      billingSummary.currentPlan
    );

    const generation = generateTimetableVariantsGA(
      parsed.data.constraints,
      variantCountDecision.effective
    );
    const variants = generation.variants;
    const { generatedCount, limitingFactors } = generation.diagnostics;
    const internalRequestedCount = generation.diagnostics.requestedCount;

    if (generatedCount === 0) {
      return NextResponse.json(
        {
          message:
            "No timetable variants could be generated for the current inserted subjects, faculties, and rooms.",
          limitingFactors,
          requestedCount: variantCountDecision.requested,
          effectiveRequestedCount: internalRequestedCount,
          generatedCount,
        },
        { status: 422 }
      );
    }

    const warningMessages: string[] = [];
    if (variantCountDecision.capped) {
      if (variantCountDecision.planLimit === null) {
        warningMessages.push(
          `Requested ${variantCountDecision.requested} variants. Processing is capped at ${variantCountDecision.effective} for system safety.`
        );
      } else {
        warningMessages.push(
          `Your ${billingSummary.currentPlan} plan allows up to ${variantCountDecision.planLimit} variants per generation.`
        );
      }
    }

    if (generatedCount < internalRequestedCount) {
      warningMessages.push(
        `Only ${generatedCount} unique variant${generatedCount === 1 ? " is" : "s are"} possible for current inserted subjects/faculties/rooms (requested ${internalRequestedCount}).`
      );
    }

    const warning = warningMessages.length > 0 ? warningMessages.join(" ") : null;

    saveGeneratedVariants(variants);

    if (useDatabase && userId) {
      const workspaceId = await getCurrentWorkspaceId();
      
      const variantsRef = adminDb.collection("timetableVariants");
      const oldVariants = await variantsRef.where("workspaceId", "==", workspaceId || userId).get();
      const batch = adminDb.batch();
      oldVariants.docs.forEach((doc) => batch.delete(doc.ref));
      
      variants.forEach((variant, index) => {
        const newRef = variantsRef.doc();
        batch.set(newRef, {
          userId: userId!,
          workspaceId: workspaceId || userId!,
          name: variant.name,
          score: variant.score,
          constraints: parsed.data.constraints,
          slots: variant.slots,
          isActive: index === 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      // Create a history snapshot
      const historyRef = adminDb.collection("timetable_history").doc();
      batch.set(historyRef, {
        userId: userId!,
        workspaceId: workspaceId || userId!,
        constraints: parsed.data.constraints,
        createdAt: new Date(),
        // Only keep the essential details to avoid bloated db size, if needed. But variants are small enough.
        variants: variants.map(v => ({ name: v.name, score: v.score, slots: v.slots })),
      });

      // Maintain history limit
      const limit = billingSummary.features.versionHistory ? 10 : 3;
      const historyQuery = await adminDb.collection("timetable_history")
        .where("workspaceId", "==", workspaceId || userId!)
        .get();
      
      const sortedHistory = [...historyQuery.docs].sort((a, b) => {
        const aVal = a.data().createdAt?.toMillis?.() ?? 0;
        const bVal = b.data().createdAt?.toMillis?.() ?? 0;
        return bVal - aVal;
      });

      // We will add 1 new history, so if it has >= limit, we delete starting from index limit - 1
      if (sortedHistory.length >= limit) {
        const docsToDelete = sortedHistory.slice(limit - 1);
        docsToDelete.forEach(doc => batch.delete(doc.ref));
      }

      await batch.commit();
    }

    return NextResponse.json({
      message:
        warning ??
        `Variants generated successfully (${generatedCount}/${internalRequestedCount}).`,
      variants,
      warning,
      limitingFactors,
      requestedCount: variantCountDecision.requested,
      effectiveRequestedCount: internalRequestedCount,
      plan: billingSummary.currentPlan,
      variantLimit: billingSummary.features.maxVariants,
      generatedCount,
    });
  } catch (error) {
    console.error("Scheduler generate route failed:", error);
    return NextResponse.json(
      {
        message: "Unable to generate timetable variants due to an internal server error.",
      },
      { status: 500 }
    );
  }
}


