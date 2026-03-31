import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasRazorpay, env } from "@/lib/env";
import { razorpay, getRazorpayPlanId } from "@/lib/razorpay";
import type { PlanId, BillingIntervalId } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasRazorpay) {
      return NextResponse.json({ message: "Razorpay is not configured." }, { status: 503 });
    }

    const payload = await request.json().catch(() => null);
    const { plan, interval } = (payload ?? {}) as { plan?: PlanId; interval?: BillingIntervalId };

    if (!plan || !interval || plan === "free") {
      return NextResponse.json({ message: "Valid plan and interval are required." }, { status: 400 });
    }

    const planId = getRazorpayPlanId(plan as Exclude<PlanId, "free">, interval);
    if (!planId) {
      return NextResponse.json({ message: "Razorpay plan not configured for this tier." }, { status: 400 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email ?? "";
    const userName = session.user.name ?? "";

    // total_count: monthly = 120 months (10 yrs rolling), yearly = 10 cycles
    const totalCount = interval === "yearly" ? 10 : 120;

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: totalCount,
      notes: {
        userId,
        plan,
        interval,
        userEmail,
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: env.RAZORPAY_KEY_ID,
      userName,
      userEmail,
      plan,
      interval,
    });
  } catch (error) {
    console.error("Razorpay subscribe error:", error);
    return NextResponse.json({ message: "Failed to create subscription." }, { status: 500 });
  }
}
