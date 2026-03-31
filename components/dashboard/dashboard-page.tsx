"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CalendarPlus2, Sparkles, TrendingUp, BarChart3, Layers } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import type {
  ActivityItem,
  BillingSummary,
  DashboardStat,
  PlanId,
} from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarEventInput {
  id?: string;
  title: string;
  start: string;
  end?: string;
  color?: string;
}

interface DashboardResponse {
  stats: DashboardStat[];
  activity: ActivityItem[];
  events: CalendarEventInput[];
}

const DASHBOARD_CACHE_KEY = "schedulr.dashboard.cache.v2";
const BILLING_CACHE_KEY = "schedulr.billing.cache.v3";
const ADS_CACHE_PREFIX = "schedulr.ads.cache.v1:";

const typeIconMap = {
  schedule: CalendarPlus2,
  billing: Sparkles,
  system: AlertTriangle,
} as const;

const statIconMap = [
  { icon: Activity, gradient: "from-blue-500 to-cyan-400" },
  { icon: Layers, gradient: "from-violet-500 to-purple-400" },
  { icon: BarChart3, gradient: "from-cyan-500 to-teal-400" },
  { icon: TrendingUp, gradient: "from-amber-500 to-orange-400" },
];

function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "pro" || value === "department" || value === "institution";
}

export function DashboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const showAdminTestMode = process.env.NODE_ENV !== "production";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [events, setEvents] = useState<CalendarEventInput[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [switchingPlan, setSwitchingPlan] = useState<PlanId | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as DashboardResponse;
          setStats(parsed.stats);
          setActivity(parsed.activity);
          setEvents(parsed.events);
          setLoading(false);
        } catch {
          sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
        }
      }
    }

    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/dashboard");
        const payload = (await response.json()) as DashboardResponse;
        if (response.ok) {
          setStats(payload.stats);
          setActivity(payload.activity);
          setEvents(payload.events);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(payload));
          }
        }
      } catch {
        // Keep cached dashboard data when network is slow or unavailable.
      } finally {
        setLoading(false);
      }
    };
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (!showAdminTestMode) return;

    const loadBillingPlan = async () => {
      try {
        const response = await fetch("/api/billing?refresh=1", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | BillingSummary
          | null;
        if (!response.ok) return;
        if (!isPlanId(payload?.currentPlan)) return;
        setCurrentPlan(payload.currentPlan);
      } catch {
        // Keep default if billing lookup fails.
      }
    };

    void loadBillingPlan();
  }, [showAdminTestMode]);

  async function switchPlanForTesting(plan: PlanId) {
    if (switchingPlan || plan === currentPlan) return;

    if (status !== "authenticated") {
      toast.error("Sign in first to use admin test mode.");
      return;
    }

    setSwitchingPlan(plan);
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (BillingSummary & { message?: string })
        | { message?: string }
        | null;

      if (!response.ok) {
        toast.error(payload?.message ?? "Unable to switch plan.");
        return;
      }

      const nextPlan = isPlanId((payload as BillingSummary | null)?.currentPlan)
        ? (payload as BillingSummary).currentPlan
        : plan;
      setCurrentPlan(nextPlan);

      if (typeof window !== "undefined") {
        sessionStorage.removeItem(BILLING_CACHE_KEY);
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith(ADS_CACHE_PREFIX)) {
            sessionStorage.removeItem(key);
          }
        }
      }

      toast.success(`Plan switched to ${nextPlan.toUpperCase()} for testing.`);
      router.refresh();
    } catch {
      toast.error("Unable to switch plan.");
    } finally {
      setSwitchingPlan(null);
    }
  }

  async function addEvent() {
    if (!selectedDate || !eventTitle) {
      toast.error("Provide both date and title.");
      return;
    }

    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: eventTitle, start: new Date(selectedDate).toISOString() }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.message ?? "Failed to add event.");
      return;
    }
    setEvents((prev) => [...prev, data.event]);
    setModalOpen(false);
    setEventTitle("");
    toast.success("Calendar event added.");
  }

  const action = useMemo(
    () => (
      <Button onClick={() => setModalOpen(true)} className="btn-gradient rounded-lg px-5">
        <CalendarPlus2 className="mr-2 h-4 w-4" />
        Add Event
      </Button>
    ),
    []
  );

  const calendarRef = useRef<FullCalendar>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Track schedule health, activity, and key events in one clean workspace."
        action={action}
      />

      {showAdminTestMode ? (
        <div className="glass-card glow-border overflow-hidden border-dashed border-violet-500/20">
          <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500" />
          <div className="space-y-3 p-4">
            <div>
              <p className="text-sm font-semibold text-brand-text">
                Admin Test Mode
              </p>
              <p className="text-xs text-brand-text-secondary">
                Quickly switch subscription plan for this account to test feature access.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["free", "pro", "department", "institution"] as const).map((plan) => (
                <Button
                  key={plan}
                  type="button"
                  size="sm"
                  className={
                    currentPlan === plan
                      ? "btn-gradient rounded-lg text-xs"
                      : "rounded-lg border border-white/10 bg-white/5 text-xs text-brand-text-secondary hover:bg-white/10"
                  }
                  disabled={
                    switchingPlan !== null ||
                    status !== "authenticated" ||
                    currentPlan === plan
                  }
                  onClick={() => void switchPlanForTesting(plan)}
                >
                  {switchingPlan === plan ? "Switching..." : plan.toUpperCase()}
                </Button>
              ))}
              <span className="text-xs text-brand-text-secondary">
                Current: <strong className="gradient-text">{currentPlan.toUpperCase()}</strong>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, idx) => {
            const iconConfig = statIconMap[idx % statIconMap.length];
            const Icon = iconConfig.icon;
            return (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="glass-card glow-border group h-full transition-all duration-500 hover:-translate-y-1 hover:shadow-card-hover">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-brand-text-secondary">{stat.label}</p>
                        <p className="mt-2 text-3xl font-bold text-brand-text">{stat.value}</p>
                      </div>
                      <span className={`rounded-xl bg-gradient-to-br ${iconConfig.gradient} p-2.5 text-white shadow-lg shadow-blue-500/20 transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">{stat.trend}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Activity Feed */}
        <div className="glass-card glow-border overflow-hidden lg:col-span-4">
          <div className="border-b border-white/5 p-5">
            <h3 className="text-lg font-semibold text-brand-text">Recent Activity</h3>
          </div>
          <div className="space-y-1 p-4">
            {activity.map((item, idx) => {
              const Icon = typeIconMap[item.type];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                  className="group flex items-start gap-3 rounded-xl p-3 transition-colors duration-200 hover:bg-white/[0.03]"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-400 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-text">{item.title}</p>
                    <p className="truncate text-xs text-brand-text-secondary">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.at}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Calendar */}
        <div className="glass-card glow-border overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between border-b border-white/5 p-5">
            <h3 className="text-lg font-semibold text-brand-text">Academic Calendar</h3>
            <Input
              type="date"
              className="h-8 w-[150px] rounded-lg border-white/10 bg-white/5 text-sm"
              onChange={(e) => {
                if (e.target.value) {
                  const api = calendarRef.current?.getApi();
                  api?.gotoDate(e.target.value);
                }
              }}
            />
          </div>
          <div className="thin-scrollbar overflow-x-auto p-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height={520}
              events={events}
              dateClick={(arg: DateClickArg) => {
                setSelectedDate(arg.dateStr);
                setModalOpen(true);
              }}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}
            />
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="glass-card border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add calendar event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-1">
            <div className="space-y-1">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                className="rounded-lg border-white/10 bg-white/5"
                value={selectedDate ? format(new Date(selectedDate), "yyyy-MM-dd") : ""}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                placeholder="Faculty planning meeting"
                className="rounded-lg border-white/10 bg-white/5"
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
              />
            </div>
            <Button className="btn-gradient w-full rounded-lg" onClick={addEvent}>
              Save Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


