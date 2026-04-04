import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import type {
  BillingIntervalId,
  BillingSummary,
  PlanFeatures,
  PlanId,
} from "@/lib/types";

export enum PlanTier {
  FREE = "FREE",
  PRO = "PRO",
  DEPARTMENT = "DEPARTMENT",
  INSTITUTION = "INSTITUTION",
}

export enum BillingInterval {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  pro: 1,
  department: 2,
  institution: 3,
};

export const MAX_VARIANTS_TECHNICAL_LIMIT = 10_000;
export const STANDARD_SUPPORT_RESPONSE_HOURS = 24;
export const PRIORITY_SUPPORT_RESPONSE_HOURS = 4;

export const PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  free: {
    maxVariants: 3,
    adminSeats: 1,
    pdfExport: true,
    pdfWatermark: true,
    excelExport: true,
    aiExplanations: false,
    emergencyReschedule: false,
    analytics: false,
    versionHistory: false,
    googleCalendarSync: false,
    maxTemplates: 0,
    apiAccess: false,
    whiteLabel: false,
    onboardingWizard: false,
    historicalAnalytics: false,
    prioritySupport: false,
    conflictExplainer: false,
    facultyView: false,
    showAds: true,
    bulkGeneration: false,
  },
  pro: {
    maxVariants: Infinity,
    adminSeats: 1,
    pdfExport: true,
    pdfWatermark: false,
    excelExport: true,
    aiExplanations: true,
    emergencyReschedule: true,
    analytics: true,
    versionHistory: true,
    googleCalendarSync: true,
    maxTemplates: Infinity,
    apiAccess: true,
    whiteLabel: false,
    onboardingWizard: false,
    historicalAnalytics: false,
    prioritySupport: false,
    conflictExplainer: true,
    facultyView: true,
    showAds: false,
    bulkGeneration: false,
  },
  department: {
    maxVariants: Infinity,
    adminSeats: 3,
    pdfExport: true,
    pdfWatermark: false,
    excelExport: true,
    aiExplanations: true,
    emergencyReschedule: true,
    analytics: true,
    versionHistory: true,
    googleCalendarSync: true,
    maxTemplates: Infinity,
    apiAccess: true,
    whiteLabel: true,
    onboardingWizard: true,
    historicalAnalytics: false,
    prioritySupport: false,
    conflictExplainer: true,
    facultyView: true,
    showAds: false,
    bulkGeneration: false,
  },
  institution: {
    maxVariants: Infinity,
    adminSeats: 10,
    pdfExport: true,
    pdfWatermark: false,
    excelExport: true,
    aiExplanations: true,
    emergencyReschedule: true,
    analytics: true,
    versionHistory: true,
    googleCalendarSync: true,
    maxTemplates: Infinity,
    apiAccess: true,
    whiteLabel: true,
    onboardingWizard: true,
    historicalAnalytics: true,
    prioritySupport: true,
    conflictExplainer: true,
    facultyView: true,
    showAds: false,
    bulkGeneration: true,
  },
};

const DEFAULT_BILLING_STATUS = "inactive";
const ACTIVE_LIKE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
]);

function isActiveLikeStatus(status: string | null | undefined) {
  if (!status) return false;
  return ACTIVE_LIKE_SUBSCRIPTION_STATUSES.has(status.toLowerCase());
}

function createFallbackBillingSummary(): BillingSummary {
  const features = getPlanFeatures("free");
  return {
    currentPlan: "free",
    status: DEFAULT_BILLING_STATUS,
    billingInterval: null,
    subscriptionEnd: null,
    canManagePaymentMethod: false,
    features,
    supportResponseHours: STANDARD_SUPPORT_RESPONSE_HOURS,
    trialAvailable: false,
    refundEligible: false,
  };
}

export function normalizePlanId(value: string | null | undefined): PlanId {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "pro") return "pro";
  if (normalized === "department") return "department";
  if (normalized === "institution") return "institution";
  return "free";
}

export function toPlanTier(plan: PlanId): PlanTier {
  if (plan === "pro") return PlanTier.PRO;
  if (plan === "department") return PlanTier.DEPARTMENT;
  if (plan === "institution") return PlanTier.INSTITUTION;
  return PlanTier.FREE;
}

export function fromPlanTier(value: PlanTier | string | null | undefined): PlanId {
  if (!value) return "free";
  if (value === PlanTier.PRO || value === "PRO") return "pro";
  if (value === PlanTier.DEPARTMENT || value === "DEPARTMENT") return "department";
  if (value === PlanTier.INSTITUTION || value === "INSTITUTION") return "institution";
  return "free";
}

export function normalizeBillingIntervalId(
  value: string | null | undefined
): BillingIntervalId {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "yearly" ? "yearly" : "monthly";
}

export function toBillingInterval(
  value: BillingIntervalId | null | undefined
): BillingInterval | null {
  if (!value) return null;
  return value === "yearly" ? BillingInterval.YEARLY : BillingInterval.MONTHLY;
}

export function fromBillingInterval(
  value: BillingInterval | string | null | undefined
): BillingIntervalId | null {
  if (!value) return null;
  if (value === BillingInterval.YEARLY || value === "YEARLY") return "yearly";
  if (value === BillingInterval.MONTHLY || value === "MONTHLY") return "monthly";
  return null;
}

export function isPaidPlan(plan: PlanId) {
  return plan !== "free";
}

export function getPlanFeatures(plan: PlanId): PlanFeatures {
  return { ...PLAN_FEATURES[plan] };
}

export function getVariantLimit(plan: PlanId) {
  return PLAN_FEATURES[plan].maxVariants;
}

export function getSupportResponseHours(plan: PlanId) {
  return plan === "pro" || plan === "free"
    ? STANDARD_SUPPORT_RESPONSE_HOURS
    : PRIORITY_SUPPORT_RESPONSE_HOURS;
}

export function clampVariantCountForPlan(requestedCount: number, plan: PlanId) {
  const normalizedRequested =
    Number.isFinite(requestedCount) && requestedCount > 0
      ? Math.trunc(requestedCount)
      : 1;
  const technicalClamped = Math.min(
    MAX_VARIANTS_TECHNICAL_LIMIT,
    normalizedRequested
  );
  const planLimit = getVariantLimit(plan);

  if (planLimit === null) {
    return {
      requested: normalizedRequested,
      effective: technicalClamped,
      capped: technicalClamped !== normalizedRequested,
      planLimit: null as number | null,
    };
  }

  const effective = Math.min(technicalClamped, planLimit);
  return {
    requested: normalizedRequested,
    effective,
    capped: effective !== normalizedRequested,
    planLimit,
  };
}

export function buildUserFeatureFlags(plan: PlanId) {
  const features = getPlanFeatures(plan);
  return {
    tier: toPlanTier(plan),
    adsEnabled: features.showAds,
    advancedConstraintsEnabled: features.bulkGeneration || true,
    importEnabled: features.excelExport,
    emergencyEnabled: features.emergencyReschedule,
    historicalEnabled: features.historicalAnalytics,
    supportPriority: features.prioritySupport,
  };
}

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function getUserBillingSummary(
  userId: string | null | undefined
): Promise<BillingSummary> {
  const fallback = createFallbackBillingSummary();
  if (!useDatabase || !userId) return fallback;

  let user: any = null;
  let subscription: any = null;

  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (userDoc.exists) {
      user = userDoc.data();
    }

    const subSnapshot = await adminDb
      .collection("subscriptions")
      .where("userId", "==", userId)
      .get();
      
    if (!subSnapshot.empty) {
      const sortedSubs = [...subSnapshot.docs]
        .map(doc => doc.data())
        .sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() ?? 0;
          const bTime = b.updatedAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
      subscription = sortedSubs[0];
    }
  } catch (error) {
    console.error("Firebase read error for billing summary", error);
  }

  if (!user && !subscription) return fallback;

  const userPlan = fromPlanTier(user?.tier ?? PlanTier.FREE);
  const subscriptionPlan = fromPlanTier(subscription?.plan ?? PlanTier.FREE);
  const userStatus = user?.subscriptionStatus ?? fallback.status;
  const subscriptionStatus = subscription?.status ?? fallback.status;
  const preferSubscriptionPlan =
    userPlan === "free" &&
    subscriptionPlan !== "free" &&
    (isActiveLikeStatus(subscriptionStatus) || isActiveLikeStatus(userStatus));

  const currentPlan = preferSubscriptionPlan ? subscriptionPlan : userPlan;
  const baseFeatures = getPlanFeatures(currentPlan);
  const shouldUseUserFeatureFlags = Boolean(user) && userPlan === currentPlan;
  const mergedFeatures: PlanFeatures = {
    ...baseFeatures,
    ...(shouldUseUserFeatureFlags && user
      ? {
          showAds: user.adsEnabled ?? baseFeatures.showAds,
          bulkGeneration:
            baseFeatures.bulkGeneration || user.advancedConstraintsEnabled,
          excelExport: baseFeatures.excelExport || user.importEnabled,
          emergencyReschedule:
            baseFeatures.emergencyReschedule || user.emergencyEnabled,
          historicalAnalytics:
            baseFeatures.historicalAnalytics || user.historicalEnabled,
          prioritySupport: baseFeatures.prioritySupport || user.supportPriority,
        }
      : {}),
  };

  const status = preferSubscriptionPlan ? subscriptionStatus : userStatus;
  const billingInterval = fromBillingInterval(
    preferSubscriptionPlan
      ? subscription?.billingInterval ?? user?.billingInterval ?? null
      : user?.billingInterval ?? subscription?.billingInterval ?? null
  );
  
  const getIsoString = (val: any) => val?.toDate ? val.toDate().toISOString() : val;
  
  const subscriptionEnd =
    (preferSubscriptionPlan
      ? getIsoString(subscription?.currentPeriodEnd) ??
        getIsoString(user?.subscriptionEnd) ??
        null
      : getIsoString(user?.subscriptionEnd) ??
        getIsoString(subscription?.currentPeriodEnd) ??
        null) ??
    null;
    
  const canManagePaymentMethod = Boolean(
    user?.lemonSqueezyCustomerId ?? subscription?.lemonSqueezyCustomerId ?? null
  );

  return {
    currentPlan,
    status,
    billingInterval,
    subscriptionEnd,
    canManagePaymentMethod,
    features: mergedFeatures,
    supportResponseHours: mergedFeatures.prioritySupport
      ? PRIORITY_SUPPORT_RESPONSE_HOURS
      : STANDARD_SUPPORT_RESPONSE_HOURS,
    trialAvailable: false,
    refundEligible: false,
  };
}


