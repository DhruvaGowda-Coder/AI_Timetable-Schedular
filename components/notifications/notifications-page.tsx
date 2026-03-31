"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellRing, Check, CheckCheck, CheckCircle2, CircleAlert, Filter, Info, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap = {
  success: CheckCircle2,
  warning: CircleAlert,
  info: Info,
} as const;

const toneMap = {
  success: {
    accent: "bg-emerald-500/70",
    icon: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    accent: "bg-amber-500/70",
    icon: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    badge: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  info: {
    accent: "bg-sky-500/70",
    icon: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    badge: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  },
} as const;

const categoryLabelMap = {
  success: "Success",
  warning: "Warning",
  info: "Info",
} as const;

type NotificationFilter = "all" | "unread" | "read";
const NOTIFICATIONS_CACHE_KEY = "schedulr.notifications.cache.v2";

function formatNotificationTime(value: string) {
  if (value.toLowerCase().includes("ago")) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(NOTIFICATIONS_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { notifications: AppNotification[] };
          setNotifications(parsed.notifications);
          setLoading(false);
        } catch {
          sessionStorage.removeItem(NOTIFICATIONS_CACHE_KEY);
        }
      }
    }

    const load = async () => {
      try {
        const response = await fetch("/api/notifications");
        const payload = await response.json();
        if (response.ok) {
          setNotifications(payload.notifications);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(payload));
          }
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    sessionStorage.setItem(
      NOTIFICATIONS_CACHE_KEY,
      JSON.stringify({ notifications })
    );
  }, [loading, notifications]);

  async function markRead(id: string) {
    const response = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    if (!response.ok) {
      toast.error("Unable to mark notification as read.");
      return;
    }
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    toast.success("Notification marked as read.");
  }

  async function markAllRead() {
    const unread = notifications.filter((item) => !item.isRead);
    if (unread.length === 0) {
      toast.message("All notifications are already read.");
      return;
    }

    const responses = await Promise.all(
      unread.map((item) => fetch(`/api/notifications/${item.id}/read`, { method: "POST" }))
    );

    if (responses.some((response) => !response.ok)) {
      toast.error("Unable to mark all notifications as read.");
      return;
    }

    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    toast.success("All notifications marked as read.");
  }

  async function clearAllNotifications() {
    if (notifications.length === 0) {
      toast.message("No notifications to clear.");
      return;
    }

    const confirmed = window.confirm("Clear all notifications?");
    if (!confirmed) return;

    const response = await fetch("/api/notifications/clear", { method: "POST" });
    if (!response.ok) {
      toast.error("Unable to clear notifications.");
      return;
    }

    setNotifications([]);
    toast.success("Notifications cleared.");
  }

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );
  const readCount = notifications.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "unread") return notifications.filter((item) => !item.isRead);
    if (activeFilter === "read") return notifications.filter((item) => item.isRead);
    return notifications;
  }, [activeFilter, notifications]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Keep track of variant updates, warnings, and billing messages."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="surface-card">
          <CardContent className="p-4">
            <p className="text-xs text-brand-text-secondary">Total</p>
            <p className="mt-1 text-2xl font-semibold text-brand-text">{notifications.length}</p>
          </CardContent>
        </Card>
        <Card className="surface-card border-secondary/30 bg-secondary/5 dark:bg-secondary/10">
          <CardContent className="p-4">
            <p className="text-xs text-brand-text-secondary">Unread</p>
            <p className="mt-1 text-2xl font-semibold text-brand-text">{unreadCount}</p>
          </CardContent>
        </Card>
        <Card className="surface-card">
          <CardContent className="p-4">
            <p className="text-xs text-brand-text-secondary">Read</p>
            <p className="mt-1 text-2xl font-semibold text-brand-text">{readCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-card">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary/10 px-2 py-1 text-xs text-secondary">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </span>
            <Button
              size="sm"
              variant={activeFilter === "all" ? "default" : "outline"}
              onClick={() => setActiveFilter("all")}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={activeFilter === "unread" ? "default" : "outline"}
              onClick={() => setActiveFilter("unread")}
            >
              Unread
            </Button>
            <Button
              size="sm"
              variant={activeFilter === "read" ? "default" : "outline"}
              onClick={() => setActiveFilter("read")}
            >
              Read
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={notifications.length === 0}>
              <CheckCheck className="mr-1 h-4 w-4" />
              Mark all read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllNotifications}
              disabled={notifications.length === 0}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Clear all
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="surface-card">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="rounded-full bg-secondary/10 p-4 text-secondary shadow-sm">
              {notifications.length === 0 ? (
                <Bell className="h-8 w-8" />
              ) : (
                <BellRing className="h-8 w-8" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-brand-text">
              {notifications.length === 0 ? "All caught up" : `No ${activeFilter} notifications`}
            </h3>
            <p className="text-sm text-brand-text-secondary">
              {notifications.length === 0
                ? "New scheduling and billing notifications will appear here."
                : "Try a different filter to view more updates."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification, index) => {
            const Icon = iconMap[notification.category];
            const tone = toneMap[notification.category];
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Card
                  className={cn(
                    "surface-card relative overflow-hidden border transition-all duration-200 hover:shadow-md",
                    notification.isRead
                      ? "hover:border-brand-border/80"
                      : "border-secondary/40 bg-secondary/5 dark:bg-secondary/10"
                  )}
                >
                  <span className={cn("absolute left-0 top-0 h-full w-1", tone.accent)} />
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className={cn("rounded-md p-2", tone.icon)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-brand-text">{notification.title}</p>
                          {!notification.isRead ? (
                            <span className="h-2 w-2 rounded-full bg-secondary" aria-hidden />
                          ) : null}
                        </div>
                        <p className="text-sm text-brand-text-secondary">{notification.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge className={cn("rounded-full px-2.5 py-0.5 text-[11px]", tone.badge)}>
                            {categoryLabelMap[notification.category]}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {formatNotificationTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    {!notification.isRead ? (
                      <Button variant="outline" size="sm" onClick={() => markRead(notification.id)}>
                        Mark read
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5" />
                        Read
                      </span>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}


