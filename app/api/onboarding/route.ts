import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSystemUserId } from "@/lib/system-user";

export async function GET() {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ onboardingCompleted: true });
    }

    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ onboardingCompleted: false });
    }

    const data = userDoc.data();
    return NextResponse.json({
      onboardingCompleted: data?.onboardingCompleted ?? false,
    });
  } catch (error) {
    console.error("Onboarding GET error:", error);
    return NextResponse.json({ onboardingCompleted: true });
  }
}

export async function POST() {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    await adminDb.collection("users").doc(userId).update({
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding POST error:", error);
    return NextResponse.json(
      { message: "Failed to update onboarding status." },
      { status: 500 }
    );
  }
}


