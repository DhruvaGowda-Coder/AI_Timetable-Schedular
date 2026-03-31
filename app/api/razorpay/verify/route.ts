import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import type { PlanId, BillingIntervalId } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => null);
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      plan,
      interval,
    } = (payload ?? {}) as {
      razorpay_payment_id?: string;
      razorpay_subscription_id?: string;
      razorpay_signature?: string;
      plan?: PlanId;
      interval?: BillingIntervalId;
    };

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !plan || !interval) {
      return NextResponse.json({ message: "Missing required fields." }, { status: 400 });
    }

    // Verify HMAC SHA256 signature
    const generated = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (generated !== razorpay_signature) {
      console.error("Razorpay signature mismatch");
      return NextResponse.json({ message: "Invalid payment signature." }, { status: 400 });
    }

    const userId = session.user.id;

    // Update Firestore user document
    const userRef = adminDb.collection("users").doc(userId);
    await userRef.set(
      {
        tier: plan.toUpperCase(),
        billingInterval: interval.toUpperCase(),
        subscriptionStatus: "active",
        paymentProvider: "razorpay",
        razorpaySubscriptionId: razorpay_subscription_id,
        razorpayPaymentId: razorpay_payment_id,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // Also write to subscriptions collection for consistency
    const subRef = adminDb.collection("subscriptions").doc(razorpay_subscription_id);
    await subRef.set({
      userId,
      plan: plan.toUpperCase(),
      billingInterval: interval.toUpperCase(),
      status: "active",
      paymentProvider: "razorpay",
      razorpaySubscriptionId: razorpay_subscription_id,
      razorpayPaymentId: razorpay_payment_id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Razorpay verify error:", error);
    return NextResponse.json({ message: "Verification failed." }, { status: 500 });
  }
}
