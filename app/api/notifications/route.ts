import { NextResponse } from "next/server";
import { getMemoryNotifications } from "@/lib/server-store";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import { getSystemUserId } from "@/lib/system-user";

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function GET() {
  if (useDatabase) {
    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({
        notifications: getMemoryNotifications().sort(
          (a, b) => Number(a.isRead) - Number(b.isRead)
        ),
      });
    }

    const snapshot = await adminDb
      .collection("notifications")
      .where("userId", "==", userId)
      .get();

    const sortedDocs = [...snapshot.docs].sort((a, b) => {
      const aDate = a.data().createdAt?.toDate?.() || new Date(a.data().createdAt || 0);
      const bDate = b.data().createdAt?.toDate?.() || new Date(b.data().createdAt || 0);
      return bDate.getTime() - aDate.getTime();
    });

    return NextResponse.json({
      notifications: sortedDocs.map((doc) => {
        const notification = doc.data();
        let createdAtIso = notification.createdAt;
        if (createdAtIso?.toDate) createdAtIso = createdAtIso.toDate().toISOString();
        else if (createdAtIso instanceof Date) createdAtIso = createdAtIso.toISOString();

        return {
          id: doc.id,
          title: notification.title,
          description: notification.description,
          createdAt: createdAtIso,
          isRead: notification.isRead,
          category: notification.category.toLowerCase(),
        };
      }),
    });
  }

  return NextResponse.json({
    notifications: getMemoryNotifications().sort(
      (a, b) => Number(a.isRead) - Number(b.isRead)
    ),
  });
}


