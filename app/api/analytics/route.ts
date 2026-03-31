import { NextResponse } from "next/server";
import { listGeneratedVariants } from "@/lib/server-store";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import { getUserBillingSummary } from "@/lib/subscription";
import { getSystemUserId } from "@/lib/system-user";
import type { TimetableSlot } from "@/lib/types";

function normalizeSlots(raw: unknown): TimetableSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as TimetableSlot).day === "string" &&
        typeof (item as TimetableSlot).slotLabel === "string" &&
        typeof (item as TimetableSlot).subject === "string" &&
        typeof (item as TimetableSlot).faculty === "string" &&
        typeof (item as TimetableSlot).room === "string"
    )
    .map((item) => item as TimetableSlot);
}

function getVariantDisplayName(rawName: unknown, index: number) {
  const normalized = typeof rawName === "string" ? rawName.trim() : "";
  if (!normalized || /^variant$/i.test(normalized)) {
    return `Variant ${index + 1}`;
  }
  return normalized;
}

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const scope = requestUrl.searchParams.get("scope");
  const guestScopeRequested = scope === "guest";
  const userId = useDatabase ? await getSystemUserId() : null;

  if (useDatabase && userId) {
    const billingSummary = await getUserBillingSummary(userId);
    const historicalEnabled = billingSummary.features.historicalAnalytics;

    const variantsSnapshot = await adminDb
      .collection("timetableVariants")
      .where("userId", "==", userId)
      .orderBy("createdAt", "asc")
      .get();

    const effectiveVariants = variantsSnapshot.docs.map((doc, index) => {
      const variant = doc.data();
      return {
        id: doc.id,
        name: getVariantDisplayName(variant.name, index),
        score: variant.score,
        slots: normalizeSlots(variant.slots),
      };
    });

    const metrics = effectiveVariants.map((variant, idx) => ({
      variantId: variant.id,
      utilization: Math.min(100, variant.score + 5),
      roomBalance: Math.max(50, variant.score - 8),
      facultyLoad: Math.max(55, variant.score - 5 + (idx % 3) * 3),
      clashCount: variant.score > 90 ? 0 : 1,
    }));

    return NextResponse.json({
      historicalEnabled,
      metrics,
      variants: effectiveVariants.map((variant) => ({
        id: variant.id,
        name: variant.name,
      })),
      variantSlots: effectiveVariants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        slots: variant.slots,
      })),
    });
  }

  if (useDatabase && !guestScopeRequested) {
    return NextResponse.json({
      historicalEnabled: false,
      metrics: [],
      variants: [],
      variantSlots: [],
    });
  }

  // Guest mode and no-database mode both use free-plan, in-memory analytics.
  const historicalEnabled = false;
  const allVariants = listGeneratedVariants();
  const effectiveVariants = allVariants.map((variant, index) => ({
    ...variant,
    name: getVariantDisplayName(variant.name, index),
  }));

  const fallbackMetrics = effectiveVariants.map((variant, idx) => ({
    variantId: variant.id,
    utilization: Math.min(100, variant.score + 5),
    roomBalance: Math.max(50, variant.score - 8),
    facultyLoad: Math.max(55, variant.score - 5 + (idx % 3) * 3),
    clashCount: variant.score > 90 ? 0 : 1,
  }));

  return NextResponse.json({
    historicalEnabled,
    metrics: fallbackMetrics,
    variants: effectiveVariants.map((variant) => ({
      id: variant.id,
      name: variant.name,
    })),
    variantSlots: effectiveVariants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      slots: variant.slots,
    })),
  });
}


