import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAppliedEmergencyVariant,
  generateEmergencyImpactAnalysis,
} from "@/lib/emergency-rescheduler";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import {
  addSystemNotification,
  listGeneratedVariants,
  saveGeneratedVariants,
} from "@/lib/server-store";
import { getUserBillingSummary } from "@/lib/subscription";
import {
  getSystemUserId,
  getCurrentWorkspaceId,
} from "@/lib/system-user";
import { MAX_SLOTS_PER_DAY, TIME_PATTERN } from "@/lib/scheduler-utils";
import type { TimetableVariant } from "@/lib/types";

const slotSchema = z.object({
  day: z.string().trim().min(1),
  slotLabel: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  faculty: z.string().trim().min(1),
  room: z.string().trim().min(1),
});

const variantSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  score: z.number().int().min(0).max(100),
  createdAt: z.string().optional(),
  slots: z.array(slotSchema).min(1),
});

const subjectSchema = z.object({
  name: z.string().trim().min(1),
  weeklyHours: z.number().int().min(1).max(8),
  maxPerDay: z.number().int().min(1).max(6).optional(),
});

const facultySchema = z.object({
  name: z.string().trim().min(1),
  canTeach: z.array(z.string()).default([]),
  unavailableDays: z.array(z.string()).default([]),
});

const roomSchema = z.object({
  name: z.string().trim().min(1),
  capacity: z.number().int().min(1),
});

const slotTimingSchema = z.object({
  start: z.string().regex(TIME_PATTERN),
  end: z.string().regex(TIME_PATTERN),
});

const constraintsSchema = z
  .object({
    days: z.array(z.string()).default([]),
    slotsPerDay: z.number().int().min(0).max(MAX_SLOTS_PER_DAY),
    slotTimings: z.array(slotTimingSchema).max(MAX_SLOTS_PER_DAY),
    subjects: z.array(subjectSchema).default([]),
    faculties: z.array(facultySchema).default([]),
    rooms: z.array(roomSchema).default([]),
  })
  .superRefine((value, ctx) => {
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

const eventSchema = z
  .object({
    type: z.enum(["faculty_unavailable", "room_unavailable", "slot_blocked"]),
    entityName: z.string().trim().optional(),
    day: z.string().trim().optional(),
    slotLabel: z.string().trim().optional(),
    reason: z.string().trim().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.type === "faculty_unavailable" || value.type === "room_unavailable") &&
      (!value.entityName || value.entityName.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entityName"],
        message: "Entity name is required for faculty/room disruptions.",
      });
    }

    if (
      value.type === "slot_blocked" &&
      (!value.day || value.day.length === 0) &&
      (!value.slotLabel || value.slotLabel.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["day"],
        message: "Provide at least day or slot label for a blocked-slot disruption.",
      });
    }
  });

const requestSchema = z.object({
  mode: z.enum(["propose", "apply"]).default("propose"),
  constraints: constraintsSchema,
  variant: variantSchema,
  event: eventSchema,
  proposalId: z.string().optional(),
  autoApply: z.boolean().optional().default(false),
});

function normalizeVariant(input: z.infer<typeof variantSchema>): TimetableVariant {
  return {
    id: input.id,
    name: input.name,
    score: input.score,
    createdAt: input.createdAt ?? new Date().toISOString(),
    slots: input.slots,
  };
}

function buildMemoryVariantList(
  appliedVariant: TimetableVariant,
  baselineVariant: TimetableVariant
) {
  const existing = listGeneratedVariants();
  const source = existing.length > 0 ? existing : [baselineVariant];
  const deduped = source.filter(
    (variant) => variant.id !== appliedVariant.id && variant.id !== baselineVariant.id
  );
  return [appliedVariant, baselineVariant, ...deduped].slice(0, 20);
}

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid emergency rescheduling payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const userId = useDatabase ? await getSystemUserId() : null;
  const billingSummary = await getUserBillingSummary(userId);
  if (!billingSummary.features.emergencyReschedule) {
    return NextResponse.json(
      {
        message: "Emergency rescheduling is available on Pro plans and above.",
      },
      { status: 403 }
    );
  }

  const mode = parsed.data.mode;
  const baselineVariant = normalizeVariant(parsed.data.variant);
  const analysis = generateEmergencyImpactAnalysis(
    parsed.data.constraints,
    baselineVariant,
    parsed.data.event
  );

  if (mode === "propose" && !parsed.data.autoApply) {
    return NextResponse.json({
      message: analysis.message,
      analysis,
    });
  }

  const proposalId = parsed.data.proposalId ?? analysis.proposals[0]?.id;
  if (!proposalId) {
    return NextResponse.json(
      {
        message: "No feasible proposal is available to apply.",
        analysis,
      },
      { status: 422 }
    );
  }

  const selectedProposal = analysis.proposals.find(
    (proposal) => proposal.id === proposalId
  );
  if (!selectedProposal) {
    return NextResponse.json(
      {
        message: "Selected proposal was not found.",
        analysis,
      },
      { status: 404 }
    );
  }

  if (selectedProposal.unresolvedCount > 0) {
    return NextResponse.json(
      {
        message:
          "Selected proposal still has unresolved impacted classes. Update constraints and try again.",
        analysis,
        selectedProposalId: selectedProposal.id,
      },
      { status: 422 }
    );
  }

  let appliedVariant = createAppliedEmergencyVariant(selectedProposal);

  const reasonSuffix =
    parsed.data.event.reason && parsed.data.event.reason.length > 0
      ? ` Reason: ${parsed.data.event.reason}.`
      : "";
  const notificationTitle = "Emergency Reschedule Applied";
  const notificationDescription = `${analysis.impactedSlots.length} impacted class${
    analysis.impactedSlots.length === 1 ? "" : "es"
  } were updated using "${selectedProposal.label}".${reasonSuffix}`;

  if (useDatabase && userId) {
    const workspaceId = await getCurrentWorkspaceId();
    const variantsRef = adminDb.collection("timetableVariants");
    const activeVariants = await variantsRef
      .where("workspaceId", "==", workspaceId || userId)
      .where("isActive", "==", true)
      .get();

    const batch = adminDb.batch();

    activeVariants.docs.forEach((doc) => {
      batch.update(doc.ref, { isActive: false });
    });

    const newVariantRef = variantsRef.doc();
    batch.set(newVariantRef, {
      userId: userId!,
      workspaceId: workspaceId || userId!,
      name: appliedVariant.name,
      score: appliedVariant.score,
      constraints: parsed.data.constraints,
      slots: appliedVariant.slots,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newNotifRef = adminDb.collection("notifications").doc();
    batch.set(newNotifRef, {
      userId: userId!,
      title: notificationTitle,
      description: notificationDescription,
      category: "WARNING",
      isRead: false,
      createdAt: new Date(),
    });

    await batch.commit();

    appliedVariant = {
      ...appliedVariant,
      id: newVariantRef.id,
      createdAt: new Date().toISOString(),
    };
  } else {
    addSystemNotification(notificationTitle, notificationDescription);
  }

  saveGeneratedVariants(buildMemoryVariantList(appliedVariant, baselineVariant));

  return NextResponse.json({
    message: "Emergency proposal applied successfully.",
    analysis,
    selectedProposalId: selectedProposal.id,
    appliedVariant,
    audit: {
      appliedAt: new Date().toISOString(),
      impactedCount: analysis.impactedSlots.length,
      changedCount: selectedProposal.changes.length,
      disruptionScore: selectedProposal.disruptionScore,
      event: parsed.data.event,
    },
  });
}


