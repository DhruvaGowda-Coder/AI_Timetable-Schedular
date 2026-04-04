import { NextResponse } from "next/server";
import { getSystemUserId } from "@/lib/system-user";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Event ID is required." }, { status: 400 });
    }

    const userId = useDatabase ? await getSystemUserId() : null;

    if (!useDatabase || !userId) {
      // For guest/memory mode, we'd need to update lib/server-store.ts
      // But based on current code, memory events are mostly placeholders.
      return NextResponse.json({ message: "Not implemented for guest mode." }, { status: 501 });
    }

    const eventRef = adminDb.collection("calendarEvents").doc(id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return NextResponse.json({ message: "Event not found." }, { status: 404 });
    }

    if (eventDoc.data()?.userId !== userId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }

    const batch = adminDb.batch();
    batch.delete(eventRef);

    const notifRef = adminDb.collection("notifications").doc();
    batch.set(notifRef, {
      userId,
      title: "Event Deleted",
      description: `Event "${eventDoc.data()?.title}" has been removed from your calendar.`,
      category: "INFO",
      isRead: false,
      createdAt: new Date(),
    });

    await batch.commit();

    return NextResponse.json({ message: "Event deleted successfully." });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json({ message: "Failed to delete event." }, { status: 500 });
  }
}
