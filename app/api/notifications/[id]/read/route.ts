import { NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/server-store";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import { getSystemUserId } from "@/lib/system-user";

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (useDatabase) {
    const userId = await getSystemUserId();
    if (!userId) {
      markNotificationRead(id);
      return NextResponse.json({ message: "Notification marked as read." });
    }

    const notificationRef = adminDb.collection("notifications").doc(id);
    const notificationDoc = await notificationRef.get();
    
    if (!notificationDoc.exists || notificationDoc.data()?.userId !== userId) {
      return NextResponse.json({ message: "Notification not found." }, { status: 404 });
    }

    await notificationRef.update({ isRead: true });

    return NextResponse.json({ message: "Notification marked as read." });
  }

  markNotificationRead(id);
  return NextResponse.json({ message: "Notification marked as read." });
}
