import { NextResponse } from "next/server";
import { formatDistanceToNow } from "date-fns";
import { getSystemUserId, getCurrentWorkspaceId } from "@/lib/system-user";
import { adminDb } from "@/lib/firebase-admin";
import { env } from "@/lib/env";
import {
  getMemoryNotifications,
  listGeneratedVariants,
  listMemoryEvents,
} from "@/lib/server-store";

export const dynamic = "force-dynamic";

const DASHBOARD_CACHE_TTL_MS = 15_000;
const dashboardCache = new Map<string, { expiresAt: number; payload: unknown }>();

function getCachedDashboardPayload(cacheKey: string) {
  const entry = dashboardCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    dashboardCache.delete(cacheKey);
    return null;
  }
  return entry.payload;
}

function setCachedDashboardPayload(cacheKey: string, payload: unknown) {
  dashboardCache.set(cacheKey, {
    expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
    payload,
  });
}

function buildGuestDashboardPayload() {
  const notifications = getMemoryNotifications();
  const generatedVariants = listGeneratedVariants();
  const events = listMemoryEvents();
  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const recentNotifications = notifications.slice(0, 5);

  const normalizedActivity = recentNotifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    description: notification.description,
    at:
      notification.createdAt.toLowerCase().includes("ago")
        ? notification.createdAt
        : formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }),
    type:
      notification.category === "success"
        ? "schedule"
        : notification.category === "warning"
        ? "system"
        : "billing",
  }));

  return {
    stats: [
      {
        id: "schedules",
        label: "Active Schedules",
        value: String(generatedVariants.length > 0 ? 1 : 0),
        trend: generatedVariants.length > 0 ? "Generated" : "No active schedule",
      },
      {
        id: "constraints",
        label: "Constraints Tracked",
        value: String(generatedVariants.length > 0 ? 1 : 0),
        trend: "In-memory",
      },
      {
        id: "variants",
        label: "Generated Variants",
        value: String(generatedVariants.length),
        trend: "In-memory",
      },
      {
        id: "success-rate",
        label: "Conflict-Free Rate",
        value: generatedVariants.length > 0 ? "Approx." : "N/A",
        trend: "Estimated",
      },
    ],
    activity: normalizedActivity,
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      color: event.color,
    })),
    unreadNotifications,
  };
}

const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export async function GET() {
  try {
    if (!useDatabase) {
      const payload = buildGuestDashboardPayload();

      return NextResponse.json(payload, {
        headers: { "Cache-Control": "private, max-age=15" },
      });
    }

    const userId = await getSystemUserId();

    if (!userId) {
      return NextResponse.json(buildGuestDashboardPayload(), {
        headers: { "Cache-Control": "private, max-age=15" },
      });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const isPersonal = workspaceId === userId;
    const variantsQuery = isPersonal
      ? adminDb.collection("timetableVariants").where("userId", "==", userId).get()
      : adminDb.collection("timetableVariants").where("workspaceId", "==", workspaceId).get();

    const eventsQuery = isPersonal
      ? adminDb.collection("calendarEvents").where("userId", "==", userId).get()
      : adminDb.collection("calendarEvents").where("workspaceId", "==", workspaceId).get();

    const cacheKey = `db:${workspaceId}`;
    const cachedPayload = getCachedDashboardPayload(cacheKey);
    if (cachedPayload) {
      return NextResponse.json(cachedPayload as Record<string, unknown>, {
        headers: { "Cache-Control": "private, max-age=15" },
      });
    }

    const [variantsSnapshot, eventsSnapshot, unreadSnapshot, recentNotificationsSnapshot] = await Promise.all([
      variantsQuery,
      eventsQuery,
      adminDb.collection("notifications").where("userId", "==", userId).where("isRead", "==", false).count().get(),
      adminDb.collection("notifications").where("userId", "==", userId).get(),
    ]);

    const variantsCount = variantsSnapshot.size;
    const activeSchedulesCount = variantsSnapshot.docs.filter((doc) => doc.data().isActive).length;
    const unreadNotifications = unreadSnapshot.data().count;

    const sortedNotifications = [...recentNotificationsSnapshot.docs].sort((a, b) => {
      const aDate = a.data().createdAt?.toDate?.() || new Date(a.data().createdAt || 0);
      const bDate = b.data().createdAt?.toDate?.() || new Date(b.data().createdAt || 0);
      return bDate.getTime() - aDate.getTime();
    });

    const activityFeed = sortedNotifications.slice(0, 5).map((doc) => {
      const n = doc.data();
      let createdAtDate = n.createdAt;
      if (createdAtDate?.toDate) createdAtDate = createdAtDate.toDate();
      else if (typeof createdAtDate === "string") createdAtDate = new Date(createdAtDate);

      return {
        id: doc.id,
        title: n.title,
        description: n.description,
        at: formatDistanceToNow(createdAtDate, { addSuffix: true }),
        type: n.category === "SUCCESS" ? "schedule" : n.category === "WARNING" ? "system" : "billing",
      };
    });

    const payload = {
      stats: [
        { id: "schedules", label: "Active Schedules", value: String(activeSchedulesCount), trend: "Synced" },
        { id: "constraints", label: "Constraints Tracked", value: "0", trend: "N/A" }, // Placeholder until constraints are normalized
        { id: "variants", label: "Generated Variants", value: String(variantsCount), trend: "Total" },
        { id: "success-rate", label: "Conflict-Free Rate", value: "N/A", trend: "No data" },
      ],
      activity: activityFeed,
      events: [...eventsSnapshot.docs]
        .sort((a, b) => {
          const aDate = a.data().startAt?.toDate?.() || new Date(a.data().startAt || 0);
          const bDate = b.data().startAt?.toDate?.() || new Date(b.data().startAt || 0);
          return aDate.getTime() - bDate.getTime();
        })
        .map((doc) => {
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
            color: event.color,
          };
        }),
      unreadNotifications,
    };

    setCachedDashboardPayload(cacheKey, payload);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=15" },
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error.message || error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}


