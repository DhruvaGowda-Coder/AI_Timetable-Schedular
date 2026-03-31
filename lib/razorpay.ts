import Razorpay from "razorpay";
import { env } from "@/lib/env";
import type { PlanId, BillingIntervalId } from "@/lib/types";

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || "rzp_test_dummy_key",
  key_secret: env.RAZORPAY_KEY_SECRET || "rzp_test_dummy_secret",
});

// INR prices — $1 ≈ ₹84, yearly = monthly × 12 × 0.8
export const RAZORPAY_INR_PRICES: Record<Exclude<PlanId, "free">, { monthly: number; yearly: number }> = {
  pro:         { monthly: 159900,  yearly: 1535040 },  // ₹1,599 / ₹15,350 (in paise)
  department:  { monthly: 499900,  yearly: 4799040 },  // ₹4,999 / ₹47,990
  institution: { monthly: 1099900, yearly: 1055904 },  // ₹10,999 / ₹1,05,590
};

export function getRazorpayPlanId(plan: Exclude<PlanId, "free">, interval: BillingIntervalId): string {
  const planAbbrev = plan === "department" ? "DEPT" : plan === "institution" ? "INST" : plan.toUpperCase();
  const key = `${planAbbrev}_${interval.toUpperCase()}` as keyof typeof env.RAZORPAY_PLANS;
  return env.RAZORPAY_PLANS[key] ?? "";
}

export function getPlanFromRazorpayPlanId(planId: string): { plan: PlanId; interval: BillingIntervalId } | null {
  const entries = Object.entries(env.RAZORPAY_PLANS) as [string, string][];
  for (const [key, val] of entries) {
    if (val === planId) {
      const [planPart, intervalPart] = key.toLowerCase().split("_") as [string, string];
      const plan = planPart === "dept" ? "department" : planPart as PlanId;
      const interval = intervalPart as BillingIntervalId;
      return { plan, interval };
    }
  }
  return null;
}
