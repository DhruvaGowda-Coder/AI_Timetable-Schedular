import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getCustomer, lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { authOptions } from "@/lib/auth";
import { env, hasLemonSqueezy } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasLemonSqueezy || !env.FIREBASE_PROJECT_ID) {
      return NextResponse.json(
        { message: "Payments are not configured on this instance." },
        { status: 503 }
      );
    }

    const userId = session.user.id;
    const userDoc = await adminDb.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const userData = userDoc.data();
    const lemonSqueezyCustomerId = userData?.lemonSqueezyCustomerId;

    if (!lemonSqueezyCustomerId) {
      return NextResponse.json(
        { message: "You do not have a payment method attached yet." },
        { status: 400 }
      );
    }

    lemonSqueezySetup({ apiKey: env.LEMON_SQUEEZY_API_KEY });
    
    // Convert to number if it's a string, assuming Lemonsqueezy SDK expects a number or string.
    const customerResponse = await getCustomer(lemonSqueezyCustomerId);

    if (customerResponse.error) {
      console.error("Lemon Squeezy get customer error:", customerResponse.error);
      return NextResponse.json(
        { message: "Could not retrieve customer details." },
        { status: 500 }
      );
    }

    const portalUrl = customerResponse.data?.data?.attributes?.urls?.customer_portal;

    if (!portalUrl) {
      return NextResponse.json(
        { message: "Failed to generate billing portal URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error("Billing portal creation failed:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}


