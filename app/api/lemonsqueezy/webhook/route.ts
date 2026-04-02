import { NextResponse } from "next/server";
import crypto from "crypto";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!env.FIREBASE_PROJECT_ID) {
      return NextResponse.json({ message: "Firebase not configured." }, { status: 503 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-signature") ?? "";

    if (!env.LEMON_SQUEEZY_WEBHOOK_SECRET) {
      return NextResponse.json({ message: "Webhook secret missing." }, { status: 503 });
    }

    const hmac = crypto.createHmac("sha256", env.LEMON_SQUEEZY_WEBHOOK_SECRET);
    const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      console.error("Lemon Squeezy webhook signature mismatch.");
      return NextResponse.json({ message: "Invalid signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const bodyData = payload.data;
    const customData = payload.meta.custom_data;
    const userId = customData?.user_id;
    const customPlan = customData?.plan;

    if (!userId && (eventName === "subscription_created" || eventName === "order_created")) {
      console.error("No user_id found in custom_data for LemonSqueezy event.");
      return NextResponse.json({ message: "Missing user_id" }, { status: 400 });
    }

    const batch = adminDb.batch();

    switch (eventName) {
      case "subscription_created":
      case "subscription_updated":
      case "subscription_resumed":
      case "subscription_expired":
      case "subscription_cancelled": {
        const subAttributes = bodyData.attributes;
        const customerId = subAttributes.customer_id;
        const variantId = subAttributes.variant_id.toString();
        const status = subAttributes.status;
        const endsAt = subAttributes.ends_at ? new Date(subAttributes.ends_at) : null;
        const renewsAt = subAttributes.renews_at ? new Date(subAttributes.renews_at) : null;
        
        let planTier = "FREE";
        let billingInterval = "MONTHLY";

        if (variantId === env.LEMON_SQUEEZY_VARIANTS.PRO_MONTHLY) {
          planTier = "PRO";
          billingInterval = "MONTHLY";
        } else if (variantId === env.LEMON_SQUEEZY_VARIANTS.PRO_YEARLY) {
          planTier = "PRO";
          billingInterval = "YEARLY";
        } else if (variantId === env.LEMON_SQUEEZY_VARIANTS.DEPT_MONTHLY) {
          planTier = "DEPARTMENT";
          billingInterval = "MONTHLY";
        } else if (variantId === env.LEMON_SQUEEZY_VARIANTS.DEPT_YEARLY) {
          planTier = "DEPARTMENT";
          billingInterval = "YEARLY";
        } else if (variantId === env.LEMON_SQUEEZY_VARIANTS.INST_MONTHLY) {
          planTier = "INSTITUTION";
          billingInterval = "MONTHLY";
        } else if (variantId === env.LEMON_SQUEEZY_VARIANTS.INST_YEARLY) {
          planTier = "INSTITUTION";
          billingInterval = "YEARLY";
        } else if (customPlan) {
          planTier = customPlan.toUpperCase();
        }

        if (eventName === "subscription_expired") {
          planTier = "FREE";
        }

        const resolvedUserId = userId || (await resolveUserByLemonCustomer(customerId));
        if (!resolvedUserId) break;

        const userRef = adminDb.collection("users").doc(resolvedUserId);
        batch.update(userRef, {
          lemonSqueezyCustomerId: customerId,
          tier: planTier,
          subscriptionStatus: eventName === "subscription_cancelled" ? "cancelled" : status,
          billingInterval: billingInterval,
          subscriptionEnd: endsAt || renewsAt,
        });

        const subRef = adminDb.collection("subscriptions").doc(bodyData.id.toString());
        batch.set(subRef, {
          userId: resolvedUserId,
          lemonSqueezySubscriptionId: bodyData.id.toString(),
          lemonSqueezyCustomerId: customerId,
          plan: planTier,
          status: eventName === "subscription_cancelled" ? "cancelled" : status,
          billingInterval: billingInterval,
          currentPeriodEnd: endsAt || renewsAt,
          updatedAt: new Date(),
        }, { merge: true });

        break;
      }

      case "order_created": {
        // Handle one-time purchases or initial order
        break;
      }
    }

    await batch.commit();

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Lemon Squeezy Webhook Error:", error);
    // Return 200 to prevent LemonSqueezy from retrying on our internal errors
    return NextResponse.json({ received: true });
  }
}

async function resolveUserByLemonCustomer(customerId: string | number) {
  const usersRef = adminDb.collection("users");
  const snapshot = await usersRef.where("lemonSqueezyCustomerId", "==", customerId).limit(1).get();
  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }
  return null;
}


