import { formatISO } from "date-fns";
import type {
  AppNotification,
  CalendarEvent,
  TimetableVariant,
} from "@/lib/types";

const memoryStore = {
  notifications: [] as AppNotification[],
  events: [] as CalendarEvent[],
  variants: [] as TimetableVariant[],
};

export function getMemoryNotifications() {
  return memoryStore.notifications;
}

export function markNotificationRead(id: string) {
  memoryStore.notifications = memoryStore.notifications.map((notification) =>
    notification.id === id ? { ...notification, isRead: true } : notification
  );
}

export function clearMemoryNotifications() {
  memoryStore.notifications = [];
}

export function addMemoryEvent(event: Omit<CalendarEvent, "id">) {
  const created = {
    ...event,
    id: `event-${Date.now()}`,
  };
  memoryStore.events.push(created);
  return created;
}

export function listMemoryEvents() {
  return memoryStore.events;
}

export function saveGeneratedVariants(variants: TimetableVariant[]) {
  memoryStore.variants = variants;
}

export function listGeneratedVariants() {
  return memoryStore.variants;
}

export function addSystemNotification(title: string, description: string) {
  const notification: AppNotification = {
    id: `notification-${Date.now()}`,
    title,
    description,
    createdAt: formatISO(new Date()),
    isRead: false,
    category: "info",
  };
  memoryStore.notifications.unshift(notification);
  return notification;
}


