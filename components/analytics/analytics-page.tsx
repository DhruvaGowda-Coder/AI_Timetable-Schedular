"use client";

import { useEffect, useMemo, useState, useId } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  Cell,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { SchedulerConstraints, TimetableSlot, TimetableVariant, VariantMetric } from "@/lib/types";
import { timeStringToMinutes } from "@/lib/scheduler-utils";

interface AnalyticsPayload {
  historicalEnabled?: boolean;
  metrics: VariantMetric[];
  variants: Array<{ id: string; name: string }>;
  variantSlots?: Array<{
    id: string;
    name: string;
    slots: TimetableSlot[];
  }>;
}

const ANALYTICS_CACHE_KEY = "schedulr.analytics.cache.v2";
const SCHEDULER_DRAFT_KEY = "schedulr.draft.v2";
const LEGACY_SCHEDULER_DRAFT_KEY = "schedulr.draft";
const CONSTRAINTS_KEY = "schedulr.constraints";

function getAnalyticsCacheKey(scope: string) {
  return `${ANALYTICS_CACHE_KEY}:${scope}`;
}

interface SchedulerDraftSnapshot {
  constraints?: Partial<SchedulerConstraints>;
  variants?: TimetableVariant[];
}

type DraftAnalyticsState =
  | { status: "none" }
  | { status: "empty_constraints" }
  | { status: "missing_variants" }
  | { status: "ready"; payload: AnalyticsPayload };

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function truncateLabel(value: string, maxLength = 14) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 3))}...`;
}

function formatFacultyTickLabel(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.length <= 14) return normalized;

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const firstPart = parts[0] ?? "";
    const hasHonorific = /^(dr|dr\.|prof|prof\.|mr|mr\.|ms|ms\.|mrs|mrs\.)$/i.test(firstPart);
    const honorific = hasHonorific ? `${firstPart.replace(/\.$/, "")}.` : "";
    const lastName = parts[parts.length - 1] ?? "";
    const compact = honorific ? `${honorific} ${lastName}` : `${parts[0]} ${lastName}`;
    if (compact.length <= 14) return compact;
    return truncateLabel(compact, 14);
  }

  return truncateLabel(normalized, 14);
}

function normalizeVariantName(name: string | null | undefined, index: number) {
  const normalized = (name ?? "").trim();
  if (!normalized || normalized.toLowerCase() === "variant") {
    return `Variant ${index + 1}`;
  }
  return normalized;
}

function normalizeDraftSlots(raw: unknown): TimetableSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as TimetableSlot).day === "string" &&
        typeof (item as TimetableSlot).slotLabel === "string" &&
        typeof (item as TimetableSlot).subject === "string" &&
        typeof (item as TimetableSlot).faculty === "string" &&
        typeof (item as TimetableSlot).room === "string"
    )
    .map((item) => item as TimetableSlot);
}

function buildVariantMetrics(
  variants: Array<{ id: string; score: number }>
): VariantMetric[] {
  return variants.map((variant, idx) => ({
    variantId: variant.id,
    utilization: clampPercent(variant.score + 5),
    roomBalance: clampPercent(Math.max(50, variant.score - 8)),
    facultyLoad: clampPercent(Math.max(55, variant.score - 5 + (idx % 3) * 3)),
    clashCount: variant.score > 90 ? 0 : 1,
  }));
}

function buildPayloadFromDraftVariants(rawVariants: unknown): AnalyticsPayload | null {
  if (!Array.isArray(rawVariants)) return null;

  const variants = rawVariants
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const variant = item as Partial<TimetableVariant>;
      const id =
        typeof variant.id === "string" && variant.id.trim().length > 0
          ? variant.id
          : `draft-variant-${index + 1}`;
      const name =
        typeof variant.name === "string" && variant.name.trim().length > 0
          ? variant.name
          : `Variant ${index + 1}`;
      const score = Number.isFinite(variant.score) ? Number(variant.score) : 0;
      return {
        id,
        name,
        score,
        slots: normalizeDraftSlots(variant.slots),
      };
    });

  if (variants.length === 0) return null;

  return {
    historicalEnabled: true,
    metrics: buildVariantMetrics(variants),
    variants: variants.map((variant) => ({ id: variant.id, name: variant.name })),
    variantSlots: variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      slots: variant.slots,
    })),
  };
}

function hasMeaningfulDraftEntries(
  rawConstraints: Partial<SchedulerConstraints> | null | undefined
): boolean {
  const constraints = rawConstraints ?? {};

  const days = Array.isArray(constraints.days)
    ? constraints.days.filter((day): day is string => typeof day === "string" && day.trim().length > 0)
    : [];
  const subjects = Array.isArray(constraints.subjects)
    ? constraints.subjects
        .filter((subject) => subject && typeof subject.name === "string")
        .map((subject) => ({
          name: subject.name.trim(),
          weeklyHours: Math.max(0, Number(subject.weeklyHours) || 0),
        }))
        .filter((subject) => subject.name.length > 0)
    : [];
  const faculties = Array.isArray(constraints.faculties)
    ? constraints.faculties
        .filter((faculty) => faculty && typeof faculty.name === "string")
        .map((faculty) => ({
          name: faculty.name.trim(),
          canTeach: Array.isArray(faculty.canTeach)
            ? faculty.canTeach
                .filter((item): item is string => typeof item === "string")
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
        }))
        .filter((faculty) => faculty.name.length > 0)
    : [];
  const rooms = Array.isArray(constraints.rooms)
    ? constraints.rooms
        .filter((room) => room && typeof room.name === "string")
        .map((room) => ({ name: room.name.trim() }))
        .filter((room) => room.name.length > 0)
    : [];

  const hasAnyInsertedData =
    days.length > 0 || subjects.length > 0 || faculties.length > 0 || rooms.length > 0;
  return hasAnyInsertedData;
}

function readDraftAnalyticsState(): DraftAnalyticsState {
  if (typeof window === "undefined") {
    return { status: "none" };
  }

  const draftRaw =
    localStorage.getItem(SCHEDULER_DRAFT_KEY) ??
    localStorage.getItem(LEGACY_SCHEDULER_DRAFT_KEY);
  const constraintsRaw = localStorage.getItem(CONSTRAINTS_KEY);

  if (!draftRaw && !constraintsRaw) {
    return { status: "none" };
  }

  let parsedDraft: SchedulerDraftSnapshot | null = null;
  if (draftRaw) {
    try {
      parsedDraft = JSON.parse(draftRaw) as SchedulerDraftSnapshot;
    } catch {
      localStorage.removeItem(SCHEDULER_DRAFT_KEY);
      localStorage.removeItem(LEGACY_SCHEDULER_DRAFT_KEY);
      return { status: "none" };
    }
  }

  let parsedConstraints: Partial<SchedulerConstraints> | null = null;
  if (constraintsRaw) {
    try {
      parsedConstraints = JSON.parse(constraintsRaw) as Partial<SchedulerConstraints>;
    } catch {
      localStorage.removeItem(CONSTRAINTS_KEY);
    }
  }

  const constraintsSource = parsedDraft?.constraints ?? parsedConstraints;
  if (!hasMeaningfulDraftEntries(constraintsSource)) {
    return { status: "empty_constraints" };
  }

  const variantPayload = buildPayloadFromDraftVariants(parsedDraft?.variants);
  if (variantPayload) {
    return { status: "ready", payload: variantPayload };
  }
  return { status: "missing_variants" };
}

const lightChartColors = {
  utilization: "#2F6FE4",
  utilizationLight: "#BDD8FF",
  faculty: "#0D9488",
  facultyLight: "#A7F3D0",
  peak: "#3D7BEE",
  peakLight: "#DBEAFE",
  room: "#4A6FA5",
  roomLight: "#D7E7FF",
  grid: "#DDE8F6",
  axis: "#5B6B85",
};

const darkChartColors = {
  utilization: "#6D9EFF",
  utilizationLight: "#294883",
  faculty: "#2DD4BF",
  facultyLight: "#115E59",
  peak: "#7AA7FF",
  peakLight: "#1E3A8A",
  room: "#8CB6F7",
  roomLight: "#334E80",
  grid: "#3A4E6F",
  axis: "#B7CCE8",
};

export function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [historicalEnabled, setHistoricalEnabled] = useState(false);
  const [metrics, setMetrics] = useState<VariantMetric[]>([]);
  const [variants, setVariants] = useState<Array<{ id: string; name: string }>>([]);
  const [variantSlots, setVariantSlots] = useState<Array<{ id: string; name: string; slots: TimetableSlot[] }>>([]);
  const [selectedVariant, setSelectedVariant] = useState<string>("all");
  const [emptyHint, setEmptyHint] = useState(
    "First set data in Scheduler page and click Save Draft, then come back to Analytics."
  );
  const { resolvedTheme } = useTheme();

  // Use unique ID prefix to prevent SVG gradient conflicts
  const idPrefix = useId().replace(/:/g, "");

  const isDarkMode = resolvedTheme === "dark";
  const chartColors = isDarkMode ? darkChartColors : lightChartColors;
  const singleOverviewPalette = [
    chartColors.utilization,
    chartColors.faculty,
    chartColors.peak,
    chartColors.room,
  ];
  const analyticsScope =
    status === "authenticated"
      ? `user:${session?.user?.id ?? session?.user?.email ?? "session"}`
      : "guest";

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    let cancelled = false;
    const isAuthenticated = status === "authenticated";
    const cacheKey = getAnalyticsCacheKey(analyticsScope);

    const applyPayload = (payload: AnalyticsPayload) => {
      if (cancelled) return;
      const normalizedVariants = payload.variants.map((variant, index) => ({
        ...variant,
        name: normalizeVariantName(variant.name, index),
      }));
      const normalizedVariantSlots = (payload.variantSlots ?? []).map((variant, index) => ({
        ...variant,
        name: normalizeVariantName(variant.name, index),
      }));

      setHistoricalEnabled(Boolean(payload.historicalEnabled));
      setMetrics(payload.metrics);
      setVariants(normalizedVariants);
      setVariantSlots(normalizedVariantSlots);
      setSelectedVariant((prev) =>
        prev === "all" || normalizedVariants.some((variant) => variant.id === prev) ? prev : "all"
      );
    };

    const clearPayload = () => {
      if (cancelled) return;
      setHistoricalEnabled(false);
      setMetrics([]);
      setVariants([]);
      setVariantSlots([]);
      setSelectedVariant("all");
    };

    clearPayload();
    setLoading(true);

    if (isAuthenticated) {
      setEmptyHint("No analytics data yet. Generate variants in Scheduler to see analytics.");
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(ANALYTICS_CACHE_KEY);
      }
    } else {
      setEmptyHint("First set data in Scheduler page and click Save Draft, then come back to Analytics.");
      const draftState = readDraftAnalyticsState();
      if (draftState.status === "ready") {
        applyPayload(draftState.payload);
      }

      if (draftState.status === "empty_constraints") {
        setEmptyHint("No scheduler data found. First set data in Scheduler and click Save Draft.");
        clearPayload();
      }

      if (draftState.status === "missing_variants") {
        setEmptyHint("No variants available yet. Generate variants in Scheduler and click Save Draft.");
        clearPayload();
      }

      if (typeof window !== "undefined") {
        const cached =
          sessionStorage.getItem(cacheKey) ?? sessionStorage.getItem(ANALYTICS_CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as AnalyticsPayload;
            applyPayload(parsed);
            setLoading(false);
          } catch {
            sessionStorage.removeItem(cacheKey);
            sessionStorage.removeItem(ANALYTICS_CACHE_KEY);
          }
        }
      }
    }

    const load = async () => {
      try {
        const endpoint = isAuthenticated
          ? "/api/analytics?scope=user"
          : "/api/analytics?scope=guest";
        const response = await fetch(endpoint, { cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as AnalyticsPayload;
          applyPayload(payload);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(cacheKey, JSON.stringify(payload));
          }
        } else if (isAuthenticated) {
          clearPayload();
        }
      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [analyticsScope, status]);

  const chartData = useMemo(() => {
    return metrics.map((item, index) => {
      const variantName = variants.find((variant) => variant.id === item.variantId)?.name ?? "";
      const variantLabel = normalizeVariantName(variantName, index);
      const roomOccupation = Math.max(0, Math.min(100, item.roomBalance));
      const peakHours = Math.max(
        35,
        Math.min(100, Math.round(item.utilization * 0.58 + item.facultyLoad * 0.42 - item.clashCount * 6))
      );

      return {
        ...item,
        variantLabel,
        roomOccupation,
        peakHours,
      };
    });
  }, [metrics, variants]);

  const filteredData = useMemo(() => {
    if (selectedVariant === "all") return chartData;
    return chartData.filter((item) => item.variantId === selectedVariant);
  }, [chartData, selectedVariant]);

  const selectedVariantDetail = useMemo(() => {
    if (selectedVariant === "all") return null;
    return variantSlots.find((variant) => variant.id === selectedVariant) ?? null;
  }, [variantSlots, selectedVariant]);

  const isSingleVariantView = Boolean(selectedVariantDetail);

  const facultyBreakdown = useMemo(() => {
    if (!selectedVariantDetail) return [];
    const counts = new Map<string, number>();
    selectedVariantDetail.slots.forEach((slot) => {
      counts.set(slot.faculty, (counts.get(slot.faculty) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([faculty, classes]) => ({ faculty, classes }))
      .sort((a, b) => b.classes - a.classes);
  }, [selectedVariantDetail]);

  const peakHoursBreakdown = useMemo(() => {
    if (!selectedVariantDetail) return [];
    const counts = new Map<string, number>();
    selectedVariantDetail.slots.forEach((slot) => {
      counts.set(slot.slotLabel, (counts.get(slot.slotLabel) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([slotLabel, sessions]) => ({ slotLabel, sessions }))
      .sort((a, b) => {
        const aStart = a.slotLabel.split("-")[0] ?? "00:00";
        const bStart = b.slotLabel.split("-")[0] ?? "00:00";
        return timeStringToMinutes(aStart) - timeStringToMinutes(bStart);
      });
  }, [selectedVariantDetail]);

  const roomBreakdown = useMemo(() => {
    if (!selectedVariantDetail) return [];
    const counts = new Map<string, number>();
    selectedVariantDetail.slots.forEach((slot) => {
      counts.set(slot.room, (counts.get(slot.room) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([room, classes]) => ({ room, classes }))
      .sort((a, b) => b.classes - a.classes);
  }, [selectedVariantDetail]);

  const averages = useMemo(() => {
    if (filteredData.length === 0) {
      return { facultyLoad: 0, peakHours: 0, roomOccupation: 0 };
    }

    const aggregate = filteredData.reduce(
      (acc, item) => {
        acc.facultyLoad += item.facultyLoad;
        acc.peakHours += item.peakHours;
        acc.roomOccupation += item.roomOccupation;
        return acc;
      },
      { facultyLoad: 0, peakHours: 0, roomOccupation: 0 }
    );

    return {
      facultyLoad: Math.round(aggregate.facultyLoad / filteredData.length),
      peakHours: Math.round(aggregate.peakHours / filteredData.length),
      roomOccupation: Math.round(aggregate.roomOccupation / filteredData.length),
    };
  }, [filteredData]);

  const singleVariantSummary = useMemo(() => {
    if (!selectedVariantDetail) {
      return {
        totalSessions: 0,
        busiestSlot: "-",
        roomsUsed: 0,
      };
    }

    const busiestSlot = peakHoursBreakdown[0]?.slotLabel ?? "-";
    return {
      totalSessions: selectedVariantDetail.slots.length,
      busiestSlot,
      roomsUsed: roomBreakdown.length,
    };
  }, [peakHoursBreakdown, roomBreakdown, selectedVariantDetail]);

  const singleOverviewData = useMemo(() => {
    const metric = filteredData[0];
    if (!metric) return [];
    return [
      { label: "Utilization", value: metric.utilization },
      { label: "Faculty Load", value: metric.facultyLoad },
      { label: "Peak Hours", value: metric.peakHours },
      { label: "Room Occupation", value: metric.roomOccupation },
    ];
  }, [filteredData]);

  const tooltipStyle = {
    borderRadius: 10,
    border: isDarkMode ? "1px solid #3A4E6F" : "1px solid #E2E8F0",
    boxShadow: isDarkMode
      ? "0 12px 24px -14px rgb(2 8 23 / 0.8)"
      : "0 12px 24px -14px rgb(30 41 59 / 0.32)",
    backgroundColor: isDarkMode ? "#12213A" : "#FFFFFF",
    fontSize: "12px",
    color: isDarkMode ? "#E2ECFF" : "#1E293B",
  } as const;

  const tooltipLabelStyle = {
    color: isDarkMode ? "#F8FAFC" : "#0F172A",
    fontSize: "12px",
    fontWeight: 600,
  } as const;

  const tooltipItemStyle = {
    color: isDarkMode ? "#E2ECFF" : "#1E293B",
    fontSize: "12px",
    fontWeight: 500,
  } as const;

  const cardMotion = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.32, ease: "easeOut" as const },
  };

  const chartAreaClass = "chart-clean rounded-md bg-transparent";

  const peakChartMinWidth = useMemo(
    () => Math.max(420, peakHoursBreakdown.length * 92),
    [peakHoursBreakdown.length]
  );

  const roomChartMinWidth = useMemo(
    () => Math.max(420, roomBreakdown.length * 96),
    [roomBreakdown.length]
  );

  const allVariantsMinWidth = useMemo(
    () => Math.max(100 + filteredData.length * 100, 300), // Increased min width per item
    [filteredData.length]
  );
  const facultyChartMinWidth = useMemo(() => {
    if (!isSingleVariantView) return allVariantsMinWidth;
    const longestFacultyName = facultyBreakdown.reduce(
      (maxLength, item) => Math.max(maxLength, item.faculty.trim().length),
      0
    );
    const widthPerBar = longestFacultyName > 16 ? 92 : longestFacultyName > 12 ? 80 : 68;
    return Math.max(420, facultyBreakdown.length * widthPerBar);
  }, [allVariantsMinWidth, facultyBreakdown, isSingleVariantView]);
  const hasAnalyticsData = metrics.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={
          historicalEnabled
            ? "Separate charts for faculty load, peak hours, and room occupation, plus one combined overview."
            : "Showing all current generated variants. Historical analytics across past generations are available on Premium."
        }
        action={hasAnalyticsData ? (
          <div className="w-56">
            <Select value={selectedVariant} onValueChange={setSelectedVariant}>
              <SelectTrigger>
                <SelectValue placeholder="Choose variant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Variants</SelectItem>
                {variants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.name}
                  </SelectItem>
                ))}
                {variants.length === 0 &&
                  metrics.map((metric) => (
                    <SelectItem key={metric.variantId} value={metric.variantId}>
                      {metric.variantId}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        ) : undefined}
      />

      {!loading && !hasAnalyticsData ? (
        <Card className="surface-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">No analytics data yet</CardTitle>
            <p className="text-sm text-brand-text-secondary">
              {emptyHint}
            </p>
          </CardHeader>
        </Card>
      ) : (
        <>

      <motion.div {...cardMotion}>
        <Card className="surface-card">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-4 w-4 text-secondary" />
              Overall Performance Overview
            </CardTitle>
            <p className="text-xs text-brand-text-secondary">
              Single graph showing all key metrics together.
            </p>
          </CardHeader>
          <CardContent className={`h-[280px] ${chartAreaClass}`}>
            {loading ? (
              <Skeleton className="h-full w-full rounded-md" />
            ) : (
              <motion.div
                key={selectedVariant}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="h-full w-full min-w-0"
              >
                {isSingleVariantView ? (
                  <div className="thin-scrollbar h-full w-full overflow-x-auto overflow-y-hidden">
                    <div className="h-full" style={{ minWidth: "480px" }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
                    <BarChart data={singleOverviewData} barCategoryGap={28}>
                      <defs>
                        <linearGradient id={`${idPrefix}-overviewSingleBar`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColors.utilization} stopOpacity={0.95} />
                          <stop offset="95%" stopColor={chartColors.utilizationLight} stopOpacity={0.85} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke={chartColors.axis}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis domain={[0, 100]} stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} />
                      <ReferenceLine y={0} stroke={chartColors.axis} strokeWidth={1.25} shapeRendering="crispEdges" />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelStyle={tooltipLabelStyle}
                        itemStyle={tooltipItemStyle}
                        cursor={false}
                      />
                      <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                        barSize={42}
                        activeBar={false}
                        isAnimationActive
                        animationBegin={80}
                        animationDuration={900}
                        animationEasing="ease-out"
                      >
                        {singleOverviewData.map((item, index) => (
                          <Cell key={`${item.label}-${index}`} fill={singleOverviewPalette[index % singleOverviewPalette.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="thin-scrollbar h-full w-full overflow-x-auto overflow-y-hidden">
                    <div className="h-full" style={{ minWidth: `${allVariantsMinWidth}px` }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
                        <BarChart data={filteredData} barCategoryGap={18}>
                          <defs>
                            <linearGradient id={`${idPrefix}-overviewUtilization`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors.utilization} stopOpacity={0.95} />
                              <stop offset="95%" stopColor={chartColors.utilizationLight} stopOpacity={0.82} />
                            </linearGradient>
                            <linearGradient id={`${idPrefix}-overviewFaculty`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors.faculty} stopOpacity={0.95} />
                              <stop offset="95%" stopColor={chartColors.facultyLight} stopOpacity={0.82} />
                            </linearGradient>
                            <linearGradient id={`${idPrefix}-overviewPeak`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors.peak} stopOpacity={0.95} />
                              <stop offset="95%" stopColor={chartColors.peakLight} stopOpacity={0.82} />
                            </linearGradient>
                            <linearGradient id={`${idPrefix}-overviewRoom`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors.room} stopOpacity={0.95} />
                              <stop offset="95%" stopColor={chartColors.roomLight} stopOpacity={0.82} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                          <XAxis
                            dataKey="variantLabel"
                            stroke={chartColors.axis}
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis domain={[0, 100]} stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} />
                          <ReferenceLine y={0} stroke={chartColors.axis} strokeWidth={1.25} shapeRendering="crispEdges" />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={tooltipLabelStyle}
                            itemStyle={tooltipItemStyle}
                            cursor={false}
                          />
                          <Legend
                            verticalAlign="top"
                            height={24}
                            iconType="circle"
                            wrapperStyle={{ fontSize: 12, color: chartColors.axis }}
                          />
                          <Bar
                            name="Utilization"
                            dataKey="utilization"
                            barSize={14}
                            fill={`url(#${idPrefix}-overviewUtilization)`}
                            radius={[5, 5, 0, 0]}
                            activeBar={false}
                            isAnimationActive
                            animationBegin={40}
                            animationDuration={650}
                            animationEasing="ease-out"
                          />
                          <Bar
                            name="Faculty Load"
                            dataKey="facultyLoad"
                            barSize={14}
                            fill={`url(#${idPrefix}-overviewFaculty)`}
                            radius={[5, 5, 0, 0]}
                            activeBar={false}
                            isAnimationActive
                            animationBegin={120}
                            animationDuration={700}
                            animationEasing="ease-out"
                          />
                          <Bar
                            name="Peak Hours"
                            dataKey="peakHours"
                            barSize={14}
                            fill={`url(#${idPrefix}-overviewPeak)`}
                            radius={[5, 5, 0, 0]}
                            activeBar={false}
                            isAnimationActive
                            animationBegin={200}
                            animationDuration={750}
                            animationEasing="ease-out"
                          />
                          <Bar
                            name="Room Occupation"
                            dataKey="roomOccupation"
                            barSize={14}
                            fill={`url(#${idPrefix}-overviewRoom)`}
                            radius={[5, 5, 0, 0]}
                            activeBar={false}
                            isAnimationActive
                            animationBegin={280}
                            animationDuration={800}
                            animationEasing="ease-out"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="grid gap-4 lg:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
        }}
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
          }}
        >
          <Card className="surface-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Faculty Load</CardTitle>
              <p className="text-xs text-brand-text-secondary">
                {isSingleVariantView
                  ? `Total sessions: ${singleVariantSummary.totalSessions}`
                  : `Average: ${averages.facultyLoad}%`}
              </p>
            </CardHeader>
            <CardContent className={`h-[210px] w-full min-w-0 p-0 sm:p-6 sm:pt-0 ${chartAreaClass}`}>
              {loading ? (
                <Skeleton className="h-full w-full rounded-md" />
              ) : (
                <div className="thin-scrollbar h-full w-full overflow-x-auto overflow-y-hidden px-4 sm:px-0">
                  <div
                    className="h-full"
                    style={{
                      minWidth: isSingleVariantView
                        ? `${facultyChartMinWidth}px`
                        : `${allVariantsMinWidth}px`
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
                      <BarChart
                        data={isSingleVariantView ? facultyBreakdown : filteredData}
                        barCategoryGap={isSingleVariantView ? "28%" : "20%"}
                      >
                        <defs>
                          <linearGradient id={`${idPrefix}-facultyBar`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.faculty} stopOpacity={0.95} />
                            <stop offset="95%" stopColor={chartColors.facultyLight} stopOpacity={0.82} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis
                          dataKey={isSingleVariantView ? "faculty" : "variantLabel"}
                          stroke={chartColors.axis}
                          fontSize={11}
                          tickLine={false}
                          interval={0}
                          tickFormatter={(value: string) =>
                            isSingleVariantView ? formatFacultyTickLabel(value) : value
                          }
                          angle={isSingleVariantView ? -32 : 0}
                          textAnchor={isSingleVariantView ? "end" : "middle"}
                          height={isSingleVariantView ? 66 : 30}
                          tickMargin={isSingleVariantView ? 8 : 0}
                        />
                        <YAxis
                          domain={isSingleVariantView ? [0, "dataMax + 1"] : [0, 100]}
                          stroke={chartColors.axis}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={tooltipLabelStyle}
                          itemStyle={tooltipItemStyle}
                          cursor={false}
                        />
                        <Bar
                          dataKey={isSingleVariantView ? "classes" : "facultyLoad"}
                          fill={`url(#${idPrefix}-facultyBar)`}
                          radius={[4, 4, 0, 0]}
                          barSize={isSingleVariantView ? 28 : 24}
                          isAnimationActive
                          animationBegin={70}
                          animationDuration={760}
                          animationEasing="ease-out"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
          }}
        >
          <Card className="surface-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Peak Hours</CardTitle>
              <p className="text-xs text-brand-text-secondary">
                {isSingleVariantView
                  ? `Busiest slot: ${singleVariantSummary.busiestSlot}`
                  : `Average: ${averages.peakHours}%`}
              </p>
            </CardHeader>
            <CardContent className={`h-[210px] w-full min-w-0 p-0 sm:p-6 sm:pt-0 ${chartAreaClass}`}>
              {loading ? (
                <Skeleton className="h-full w-full rounded-md" />
              ) : (
                <div className="thin-scrollbar h-full w-full overflow-x-auto overflow-y-hidden px-4 sm:px-0">
                  <div
                    className="h-full"
                    style={{
                      minWidth: isSingleVariantView
                        ? `${peakChartMinWidth}px`
                        : `${allVariantsMinWidth}px`
                    }}
                  >
                    {isSingleVariantView ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
                        <BarChart data={peakHoursBreakdown} barCategoryGap={20}>
                          <defs>
                            <linearGradient id={`${idPrefix}-peakBarSingle`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors.peak} stopOpacity={0.95} />
                              <stop offset="95%" stopColor={chartColors.peakLight} stopOpacity={0.82} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                          <XAxis
                            dataKey="slotLabel"
                            stroke={chartColors.axis}
                            fontSize={11}
                            tickLine={false}
                            interval={0}
                            angle={-12}
                            textAnchor="end"
                            height={52}
                          />
                          <YAxis
                            domain={[0, "dataMax + 1"]}
                            stroke={chartColors.axis}
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={tooltipLabelStyle}
                            itemStyle={tooltipItemStyle}
                            cursor={false}
                          />
                          <Bar
                            dataKey="sessions"
                            fill={`url(#${idPrefix}-peakBarSingle)`}
                            radius={[4, 4, 0, 0]}
                            barSize={28}
                            isAnimationActive
                            animationBegin={70}
                            animationDuration={840}
                            animationEasing="ease-out"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
                        <BarChart data={filteredData}>
                          <defs>
                            <linearGradient id={`${idPrefix}-peakBarAll`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors.peak} stopOpacity={0.95} />
                              <stop offset="95%" stopColor={chartColors.peakLight} stopOpacity={0.82} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                          <XAxis dataKey="variantLabel" stroke={chartColors.axis} fontSize={11} tickLine={false} />
                          <YAxis domain={[0, 100]} stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={tooltipLabelStyle}
                            itemStyle={tooltipItemStyle}
                            cursor={false}
                          />
                          <Bar
                            dataKey="peakHours"
                            fill={`url(#${idPrefix}-peakBarAll)`}
                            radius={[4, 4, 0, 0]}
                            barSize={24}
                            isAnimationActive
                            animationBegin={70}
                            animationDuration={820}
                            animationEasing="ease-out"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
          }}
        >
          <Card className="surface-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Room Occupation</CardTitle>
              <p className="text-xs text-brand-text-secondary">
                {isSingleVariantView
                  ? `Rooms used: ${singleVariantSummary.roomsUsed}`
                  : `Average: ${averages.roomOccupation}%`}
              </p>
            </CardHeader>
            <CardContent className={`h-[210px] w-full min-w-0 p-0 sm:p-6 sm:pt-0 ${chartAreaClass}`}>
              {loading ? (
                <Skeleton className="h-full w-full rounded-md" />
              ) : (
                <div className="thin-scrollbar h-full w-full overflow-x-auto overflow-y-hidden px-4 sm:px-0">
                  <div
                    className="h-full"
                    style={{
                      minWidth: isSingleVariantView
                        ? `${roomChartMinWidth}px`
                        : `${allVariantsMinWidth}px`
                    }}
                  >
                    {isSingleVariantView ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
                        <BarChart data={roomBreakdown}>
                          <defs>
                            <linearGradient id={`${idPrefix}-roomBarSingle`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors.room} stopOpacity={0.95} />
                              <stop offset="95%" stopColor={chartColors.roomLight} stopOpacity={0.82} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                          <XAxis
                            dataKey="room"
                            stroke={chartColors.axis}
                            fontSize={11}
                            tickLine={false}
                            interval={0}
                            angle={-12}
                            textAnchor="end"
                            height={48}
                          />
                          <YAxis
                            domain={[0, "dataMax + 1"]}
                            stroke={chartColors.axis}
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={tooltipLabelStyle}
                            itemStyle={tooltipItemStyle}
                            cursor={false}
                          />
                          <Bar
                            dataKey="classes"
                            fill={`url(#${idPrefix}-roomBarSingle)`}
                            radius={[4, 4, 0, 0]}
                            barSize={28}
                            isAnimationActive
                            animationBegin={70}
                            animationDuration={880}
                            animationEasing="ease-out"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
                        <BarChart data={filteredData}>
                          <defs>
                            <linearGradient id={`${idPrefix}-roomBarAll`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors.room} stopOpacity={0.95} />
                              <stop offset="95%" stopColor={chartColors.roomLight} stopOpacity={0.82} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                          <XAxis dataKey="variantLabel" stroke={chartColors.axis} fontSize={11} tickLine={false} />
                          <YAxis domain={[0, 100]} stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={tooltipLabelStyle}
                            itemStyle={tooltipItemStyle}
                            cursor={false}
                          />
                          <Bar
                            dataKey="roomOccupation"
                            fill={`url(#${idPrefix}-roomBarAll)`}
                            radius={[4, 4, 0, 0]}
                            barSize={24}
                            isAnimationActive
                            animationBegin={70}
                            animationDuration={860}
                            animationEasing="ease-out"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
        </>
      )}
    </div>
  );
}


