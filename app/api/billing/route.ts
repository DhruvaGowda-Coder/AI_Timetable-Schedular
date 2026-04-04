import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import { buildUserFeatureFlags, getUserBillingSummary, BillingInterval } from "@/lib/subscription";
import { getSystemUserId } from "@/lib/system-user";
import type { BillingSummary, PlanId } from "@/lib/types";

const BILLING_CACHE_TTL_MS = 30_000;
const billingCache = new Map<
  string,
  {
    expiresAt: number;
    payload: BillingSummary;
  }
>();

function getCachedBilling(cacheKey: string) {
  const entry = billingCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    billingCache.delete(cacheKey);
    return null;
  }
  return entry.payload;
}

function setCachedBilling(cacheKey: string, payload: BillingSummary) {
  billingCache.set(cacheKey, {
    expiresAt: Date.now() + BILLING_CACHE_TTL_MS,
    payload,
  });
}

function getBillingCacheKey(userId: string | null) {
  return userId ? `db:${userId}` : "fallback:free";
}

function clearCachedBilling(cacheKey: string) {
  billingCache.delete(cacheKey);
}

function parsePlanId(value: unknown): PlanId | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "free" || normalized === "pro" || normalized === "department" || normalized === "institution") {
    return normalized as any;
  }
  return null;
}

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function GET(request: Request) {
  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
  const userId = useDatabase ? await getSystemUserId() : null;
  const cacheKey = getBillingCacheKey(userId);
  const cached = forceRefresh ? null : getCachedBilling(cacheKey);

  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  }

  const payload = await getUserBillingSummary(userId);
  setCachedBilling(cacheKey, payload);

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { message: "Admin test mode is disabled in production." },
        { status: 403 }
      );
    }

    if (!useDatabase) {
      return NextResponse.json(
        { message: "Database is required to change plan state." },
        { status: 503 }
      );
    }

    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as
      | { plan?: unknown }
      | null;
    const plan = parsePlanId(payload?.plan);
    if (!plan) {
      return NextResponse.json(
        { message: "Invalid plan. Use free, pro, department, or institution." },
        { status: 400 }
      );
    }

    const nextStatus = plan === "free" ? "inactive" : "active";
    const nextInterval =
      plan === "free" ? null : BillingInterval.MONTHLY;
    const nextFlags = buildUserFeatureFlags(plan);

    const batch = adminDb.batch();
    const userRef = adminDb.collection("users").doc(userId);

    const updateData: any = {
      tier: nextFlags.tier,
      subscriptionStatus: nextStatus,
      billingInterval: nextInterval,
      subscriptionEnd: null,
    };

    if (plan === "free") {
      updateData.lemonSqueezyCustomerId = null;
      updateData.lemonSqueezySubscriptionId = null;
    }

    batch.update(userRef, updateData);

    const subsSnapshot = await adminDb
      .collection("subscriptions")
      .where("userId", "==", userId)
      .get();

    const sortedDocs = [...subsSnapshot.docs].sort((a, b) => {
      const aDate = a.data().updatedAt?.toDate?.() || new Date(a.data().updatedAt || 0);
      const bDate = b.data().updatedAt?.toDate?.() || new Date(b.data().updatedAt || 0);
      return bDate.getTime() - aDate.getTime();
    });

    const subscriptionData: any = {
      userId,
      plan: nextFlags.tier,
      status: nextStatus,
      billingInterval: nextInterval,
      currentPeriodEnd: null,
      updatedAt: new Date(),
    };

    if (plan === "free") {
      subscriptionData.lemonSqueezySubscriptionId = null;
    }

    if (sortedDocs.length > 0) {
      batch.update(sortedDocs[0].ref, subscriptionData);
    } else {
      subscriptionData.createdAt = new Date();
      batch.set(adminDb.collection("subscriptions").doc(), subscriptionData);
    }

    await batch.commit();

    const cacheKey = getBillingCacheKey(userId);
    clearCachedBilling(cacheKey);
    const updated = await getUserBillingSummary(userId);
    setCachedBilling(cacheKey, updated);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Plan switch failure:", error);
    return NextResponse.json(
      { message: `Plan switch failure: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}


