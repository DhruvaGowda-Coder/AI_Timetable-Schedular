import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createCheckout, lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { authOptions } from "@/lib/auth";
import { env, getAppBaseUrl, hasLemonSqueezy } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasLemonSqueezy) {
      return NextResponse.json(
        { message: "Payments are not configured on this instance." },
        { status: 503 }
      );
    }

    lemonSqueezySetup({ apiKey: env.LEMON_SQUEEZY_API_KEY });

    const payload = await request.json().catch(() => null);
    const { plan, interval } = payload ?? {};

    if (!plan || !interval) {
      return NextResponse.json(
        { message: "Plan and interval are required." },
        { status: 400 }
      );
    }

    let variantId = "";
    if (plan === "pro" && interval === "monthly") {
      variantId = env.LEMON_SQUEEZY_VARIANTS.PRO_MONTHLY;
    } else if (plan === "pro" && interval === "yearly") {
      variantId = env.LEMON_SQUEEZY_VARIANTS.PRO_YEARLY;
    } else if (plan === "department" && interval === "monthly") {
      variantId = env.LEMON_SQUEEZY_VARIANTS.DEPT_MONTHLY;
    } else if (plan === "department" && interval === "yearly") {
      variantId = env.LEMON_SQUEEZY_VARIANTS.DEPT_YEARLY;
    } else if (plan === "institution" && interval === "monthly") {
      variantId = env.LEMON_SQUEEZY_VARIANTS.INST_MONTHLY;
    } else if (plan === "institution" && interval === "yearly") {
      variantId = env.LEMON_SQUEEZY_VARIANTS.INST_YEARLY;
    }

    if (!variantId) {
      return NextResponse.json(
        { message: "Invalid plan or interval selected." },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email ?? "";
    const appBaseUrl = getAppBaseUrl(request);

    const checkout = await createCheckout(env.LEMON_SQUEEZY_STORE_ID, variantId, {
      checkoutData: {
        email: userEmail,
        custom: {
          user_id: userId,
          plan: plan,
        },
      },
      productOptions: {
        redirectUrl: `${appBaseUrl}/billing?checkout=success`,
        receiptButtonText: "Return to Dashboard",
        receiptLinkUrl: `${appBaseUrl}/billing`,
      },
    });

    if (checkout.error) {
      console.error("Lemon Squeezy checkout error:", checkout.error);
      return NextResponse.json(
        { message: "Payment provider error while creating checkout." },
        { status: 500 }
      );
    }

    const url = checkout.data?.data?.attributes?.url;
    if (!url) {
      return NextResponse.json(
        { message: "Failed to generate checkout URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Checkout creation failed:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}


