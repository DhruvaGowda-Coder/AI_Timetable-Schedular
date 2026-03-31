import { NextResponse } from "next/server";
import { z } from "zod";
import { getSystemUserId } from "@/lib/system-user";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import { addMemoryEvent, addSystemNotification, listMemoryEvents } from "@/lib/server-store";

const eventSchema = z.object({
  title: z.string().min(2),
  start: z.string().datetime(),
  end: z.string().datetime().optional(),
  color: z.string().optional(),
});

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function GET() {
  try {
    if (!useDatabase) {
      return NextResponse.json({
        events: listMemoryEvents().map((event) => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          color: event.color ?? "#4A6FA5",
        })),
      });
    }

    const userId = await getSystemUserId();
    if (!userId) {
      return NextResponse.json({
        events: listMemoryEvents().map((event) => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          color: event.color ?? "#4A6FA5",
        })),
      });
    }

    const eventsSnapshot = await adminDb
      .collection("calendarEvents")
      .where("userId", "==", userId)
      .orderBy("startAt", "asc")
      .get();

    return NextResponse.json({
      events: eventsSnapshot.docs.map((doc) => {
        const event = doc.data();
        let startIso = event.startAt;
        let endIso = event.endAt;
        if (startIso?.toDate) startIso = startIso.toDate().toISOString();
        if (endIso?.toDate) endIso = endIso.toDate().toISOString();
        else if (endIso) {
          endIso = new Date(endIso).toISOString();
        }

        return {
          id: doc.id,
          title: event.title,
          start: startIso,
          end: endIso ?? undefined,
          color: event.color ?? "#4A6FA5",
        };
      }),
    });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json({ message: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = eventSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid event payload." }, { status: 400 });
    }

    const userId = useDatabase ? await getSystemUserId() : null;

    if (!useDatabase || !userId) {
      const event = addMemoryEvent({
        title: parsed.data.title,
        start: parsed.data.start,
        end: parsed.data.end,
        color: parsed.data.color ?? "#4A6FA5",
      });
      addSystemNotification(
        "New Event Scheduled",
        `Event "${parsed.data.title}" has been added to your calendar.`
      );
      return NextResponse.json(
        {
          message: "Event added.",
          event,
        },
        { status: 201 }
      );
    }

    const batch = adminDb.batch();
    
    const newEventRef = adminDb.collection("calendarEvents").doc();
    batch.set(newEventRef, {
      userId,
      title: parsed.data.title,
      startAt: new Date(parsed.data.start),
      endAt: parsed.data.end ? new Date(parsed.data.end) : null,
      color: parsed.data.color ?? "#4A6FA5",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newNotifRef = adminDb.collection("notifications").doc();
    batch.set(newNotifRef, {
      userId,
      title: "New Event Scheduled",
      description: `Event "${parsed.data.title}" has been added to your calendar.`,
      category: "INFO",
      isRead: false,
      createdAt: new Date(),
    });

    await batch.commit();

    return NextResponse.json(
      {
        message: "Event added.",
        event: {
          id: newEventRef.id,
          title: parsed.data.title,
          start: parsed.data.start,
          end: parsed.data.end ?? undefined,
          color: parsed.data.color ?? "#4A6FA5",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json({ message: "Failed to create event" }, { status: 500 });
  }
}


