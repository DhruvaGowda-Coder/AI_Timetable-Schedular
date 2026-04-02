import { NextResponse } from "next/server";
import crypto from "crypto";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import { getPlanFromRazorpayPlanId } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!env.FIREBASE_PROJECT_ID) {
      return NextResponse.json({ message: "Firebase not configured." }, { status: 503 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";

    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json({ message: "Webhook secret missing." }, { status: 503 });
    }

    // Verify webhook signature using timing-safe comparison
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
      console.error("Razorpay webhook signature mismatch");
      return NextResponse.json({ message: "Invalid signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event as string;
    const entity = payload.payload?.subscription?.entity ?? payload.payload?.payment?.entity;

    if (!entity) {
      return NextResponse.json({ received: true });
    }

    const subscriptionId: string = entity.id ?? entity.subscription_id ?? "";
    const notes = entity.notes ?? {};
    const userId: string = notes.userId ?? "";
    const planId: string = entity.plan_id ?? "";

    // Resolve plan + interval from Razorpay plan ID
    const resolved = planId ? getPlanFromRazorpayPlanId(planId) : null;
    const planTier = resolved?.plan?.toUpperCase() ?? notes.plan?.toUpperCase() ?? "FREE";
    const billingInterval = resolved?.interval?.toUpperCase() ?? notes.interval?.toUpperCase() ?? "MONTHLY";

    switch (event) {
      case "subscription.activated":
      case "subscription.charged": {
        if (!userId) break;
        const userRef = adminDb.collection("users").doc(userId);
        await userRef.set(
          {
            tier: planTier,
            billingInterval,
            subscriptionStatus: "active",
            paymentProvider: "razorpay",
            razorpaySubscriptionId: subscriptionId,
            updatedAt: new Date(),
          },
          { merge: true }
        );
        if (subscriptionId) {
          await adminDb.collection("subscriptions").doc(subscriptionId).set(
            { status: "active", plan: planTier, billingInterval, updatedAt: new Date() },
            { merge: true }
          );
        }
        break;
      }

      case "subscription.cancelled": {
        // Keep plan active until period ends — just mark cancelled
        if (!userId) break;
        await adminDb.collection("users").doc(userId).set(
          { subscriptionStatus: "cancelled", updatedAt: new Date() },
          { merge: true }
        );
        if (subscriptionId) {
          await adminDb.collection("subscriptions").doc(subscriptionId).set(
            { status: "cancelled", updatedAt: new Date() },
            { merge: true }
          );
        }
        break;
      }

      case "subscription.completed":
      case "subscription.expired": {
        // Period ended — downgrade to free
        if (!userId) break;
        await adminDb.collection("users").doc(userId).set(
          {
            tier: "FREE",
            billingInterval: null,
            subscriptionStatus: "expired",
            paymentProvider: null,
            razorpaySubscriptionId: null,
            updatedAt: new Date(),
          },
          { merge: true }
        );
        if (subscriptionId) {
          await adminDb.collection("subscriptions").doc(subscriptionId).set(
            { status: "expired", updatedAt: new Date() },
            { merge: true }
          );
        }
        break;
      }

      case "subscription.halted": {
        // Payment failed — mark halted but don't downgrade immediately
        if (!userId) break;
        await adminDb.collection("users").doc(userId).set(
          { subscriptionStatus: "halted", updatedAt: new Date() },
          { merge: true }
        );
        if (subscriptionId) {
          await adminDb.collection("subscriptions").doc(subscriptionId).set(
            { status: "halted", updatedAt: new Date() },
            { merge: true }
          );
        }
        break;
      }

      default:
        // Unknown event — still return 200 to prevent Razorpay retries
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    // Return 200 to prevent Razorpay from retrying on our errors
    return NextResponse.json({ received: true });
  }
}
