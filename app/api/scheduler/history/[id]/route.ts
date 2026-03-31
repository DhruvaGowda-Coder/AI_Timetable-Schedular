import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSystemUserId, getCurrentWorkspaceId } from "@/lib/system-user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const docRef = adminDb.collection("timetable_history").doc(id);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.workspaceId !== workspaceId) {
      return NextResponse.json({ message: "History not found." }, { status: 404 });
    }

    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      createdAt: typeof data.createdAt?.toDate === "function" ? data.createdAt.toDate().toISOString() : data.createdAt,
      constraints: data.constraints,
      variants: data.variants || [],
    });
  } catch (error) {
    console.error("Failed to fetch history ID:", error);
    return NextResponse.json(
      { message: "Failed to fetch history details" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const docRef = adminDb.collection("timetable_history").doc(id);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.workspaceId !== workspaceId) {
      return NextResponse.json({ message: "History not found." }, { status: 404 });
    }

    await docRef.delete();

    return NextResponse.json({ message: "History variant deleted successfully" });
  } catch (error) {
    console.error("Failed to delete history ID:", error);
    return NextResponse.json(
      { message: "Failed to delete from history" },
      { status: 500 }
    );
  }
}
