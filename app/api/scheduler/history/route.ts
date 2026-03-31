import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSystemUserId, getCurrentWorkspaceId } from "@/lib/system-user";
import { getUserBillingSummary } from "@/lib/subscription";

export async function GET(request: Request) {
  try {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const billingSummary = await getUserBillingSummary(userId);
    const limitCount = billingSummary.features.versionHistory ? 50 : 3;

    const snapshot = await adminDb.collection("timetable_history")
      .where("workspaceId", "==", workspaceId)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    const history = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        createdAt: typeof data.createdAt?.toDate === "function" ? data.createdAt.toDate().toISOString() : data.createdAt,
        constraints: data.constraints,
        variants: data.variants || [],
      };
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return NextResponse.json(
      { message: "Failed to fetch history." },
      { status: 500 }
    );
  }
}


