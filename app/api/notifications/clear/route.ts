import { NextResponse } from "next/server";
import { clearMemoryNotifications } from "@/lib/server-store";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import { getSystemUserId } from "@/lib/system-user";

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function POST() {
  if (useDatabase) {
    const userId = await getSystemUserId();
    if (!userId) {
      clearMemoryNotifications();
      return NextResponse.json({ message: "Notifications cleared." });
    }

    const notificationsRef = adminDb.collection("notifications");
    const snapshot = await notificationsRef.where("userId", "==", userId).get();

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return NextResponse.json({ message: "Notifications cleared." });
  }

  clearMemoryNotifications();
  return NextResponse.json({ message: "Notifications cleared." });
}


