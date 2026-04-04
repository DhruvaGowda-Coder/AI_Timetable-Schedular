"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  Download,
  History,
  LayoutTemplate,
  Link2,
  Plus,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Sparkles,
  Table2,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  exportAllVariantsToExcelZip,
  exportAllVariantsToPdfZip,
  exportVariantToExcel,
  exportVariantToPdf,
} from "@/lib/exporters";
import type {
  BillingSummary,
  BreakRule,
  FacultyConstraint,
  PlanFeatures,
  PlanId,
  RoomConstraint,
  SchedulerConstraints,
  SlotTiming,
  SubjectConstraint,
  TimetableVariant,
  BrandingConfig,
} from "@/lib/types";
import {
  MAX_SLOTS_PER_DAY,
  createSlotLabels,
  normalizeSlotTimings,
  timeStringToMinutes,
} from "@/lib/scheduler-utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "./share-dialog";
import { HistoryDrawer } from "./history-drawer";
import { TemplatesDialog } from "./templates-dialog";
import { CalendarExportDialog } from "./calendar-export-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { BulkImportDialog } from "@/components/scheduler/bulk-import-dialog";
import { EmergencyReschedulerCard } from "@/components/scheduler/emergency-rescheduler-card";
import { AIInsightsCard } from "@/components/scheduler/ai-insights-card";
import { ConflictExplainerCard } from "@/components/scheduler/conflict-explainer-card";
import { explainDiagnostics } from "@/lib/conflict-explainer";
import { RoomUtilizationChart } from "@/components/dashboard/charts/room-utilization";
import { FacultyWorkloadChart } from "@/components/dashboard/charts/faculty-workload";

const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hourOptions = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const minuteOptions = ["00", "15", "30", "45"];
const MAX_VARIANT_INPUT_VALUE = 10000;
const SCHEDULER_DRAFT_KEY = "schedulr.draft.v2";
const LEGACY_DRAFT_KEY = "schedulr.draft";
const CONSTRAINTS_KEY = "schedulr.constraints";
const BILLING_CACHE_KEY = "schedulr.billing.cache.v3";
const DEFAULT_BILLING_FEATURES: PlanFeatures = {
  maxVariants: 3,
  adminSeats: 1,
  pdfExport: true,
  pdfWatermark: true,
  excelExport: false,
  aiExplanations: false,
  emergencyReschedule: false,
  analytics: false,
  versionHistory: false,
  googleCalendarSync: false,
  maxTemplates: 0,
  apiAccess: false,
  whiteLabel: false,
  onboardingWizard: false,
  historicalAnalytics: false,
  prioritySupport: false,
  conflictExplainer: false,
  facultyView: false,
  showAds: true,
  bulkGeneration: false,
};

const EMPTY_INITIAL_CONSTRAINTS: SchedulerConstraints = {
  days: [],
  slotsPerDay: 0,
  slotTimings: [],
  subjects: [],
  faculties: [],
  rooms: [],
};
const COMPLEX_MOCK_CONSTRAINTS: SchedulerConstraints = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  slotsPerDay: 8,
  slotTimings: [
    { start: "08:30", end: "09:20" },
    { start: "09:25", end: "10:15" },
    { start: "10:20", end: "11:10" },
    { start: "11:15", end: "12:05" },
    { start: "12:45", end: "13:35" },
    { start: "13:40", end: "14:30" },
    { start: "14:35", end: "15:25" },
    { start: "15:30", end: "16:20" },
  ],
  subjects: [
    { name: "Mathematics", weeklyHours: 6, maxPerDay: 2 },
    { name: "Physics", weeklyHours: 5, maxPerDay: 2 },
    { name: "Chemistry", weeklyHours: 5, maxPerDay: 2 },
    { name: "Biology", weeklyHours: 4, maxPerDay: 2 },
    { name: "Computer Science", weeklyHours: 6, maxPerDay: 2 },
    { name: "English", weeklyHours: 3, maxPerDay: 1 },
    { name: "History", weeklyHours: 3, maxPerDay: 1 },
    { name: "Economics", weeklyHours: 3, maxPerDay: 1 },
    { name: "Statistics", weeklyHours: 4, maxPerDay: 2 },
    { name: "Electronics", weeklyHours: 4, maxPerDay: 2 },
    { name: "AI Lab", weeklyHours: 3, maxPerDay: 1 },
    { name: "Design Thinking", weeklyHours: 2, maxPerDay: 1 },
  ],
  faculties: [
    { name: "Dr. Meera Rao", canTeach: ["Mathematics", "Statistics"], unavailableDays: ["Friday"] },
    { name: "Prof. Arjun Nair", canTeach: ["Physics", "Electronics"], unavailableDays: [] },
    { name: "Dr. Kavya Menon", canTeach: ["Chemistry", "Biology"], unavailableDays: ["Wednesday"] },
    { name: "Prof. Siddharth Iyer", canTeach: ["Computer Science", "AI Lab"], unavailableDays: [] },
    { name: "Ms. Nisha Thomas", canTeach: ["English", "History"], unavailableDays: ["Monday"] },
    { name: "Dr. Pranav Shetty", canTeach: ["Economics", "Statistics"], unavailableDays: [] },
    { name: "Prof. Ritu Verma", canTeach: ["Design Thinking", "English"], unavailableDays: [] },
    { name: "Mr. Aditya Kulkarni", canTeach: ["Electronics", "Computer Science"], unavailableDays: [] },
    { name: "Dr. Farah Khan", canTeach: ["Biology", "Chemistry"], unavailableDays: [] },
    { name: "Prof. Vivek Sharma", canTeach: ["Mathematics", "Physics"], unavailableDays: ["Saturday"] },
    { name: "Ms. Asha Gupta", canTeach: ["History", "Economics"], unavailableDays: [] },
    { name: "Dr. Neel Patel", canTeach: ["AI Lab", "Statistics", "Computer Science"], unavailableDays: [] },
  ],
  rooms: [
    { name: "A-101", capacity: 60 },
    { name: "A-102", capacity: 60 },
    { name: "B-201", capacity: 48 },
    { name: "B-202", capacity: 48 },
    { name: "CS-Lab-1", capacity: 40 },
    { name: "ECE-Lab", capacity: 36 },
    { name: "Seminar-Hall", capacity: 120 },
    { name: "Innovation-Studio", capacity: 45 },
  ],
};
const COMPLEX_MOCK_VARIANT_COUNT = 10;

function splitTimeParts(value: string) {
  const [hour = "09", minute = "00"] = value.split(":");
  return {
    hour: hourOptions.includes(hour) ? hour : "09",
    minute: minuteOptions.includes(minute) ? minute : "00",
  };
}

function joinTimeParts(hour: string, minute: string) {
  return `${hour}:${minute}`;
}

function clampVariantCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_VARIANT_INPUT_VALUE, Math.trunc(value)));
}

function clampVariantCountForPlan(value: number, variantLimit: number | null) {
  const normalized = clampVariantCount(value);
  if (variantLimit === null) return normalized;
  return Math.min(normalized, variantLimit);
}

function clampSlotsPerDay(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_SLOTS_PER_DAY, Math.trunc(value)));
}

function clampSubjectMaxPerDay(value: number | undefined) {
  if (!Number.isFinite(value ?? NaN)) return 2;
  return Math.max(1, Math.min(6, Math.trunc(value as number)));
}

function normalizeConstraintsState(
  rawConstraints: Partial<SchedulerConstraints> | null | undefined
): SchedulerConstraints {
  const source = rawConstraints ?? EMPTY_INITIAL_CONSTRAINTS;
  const slotsPerDay = clampSlotsPerDay(
    Number(source.slotsPerDay ?? EMPTY_INITIAL_CONSTRAINTS.slotsPerDay)
  );

  const days = Array.isArray(source.days)
    ? source.days.filter(Boolean)
    : [];

  const subjects = Array.isArray(source.subjects)
    ? source.subjects
    : [];

  const faculties = Array.isArray(source.faculties)
    ? source.faculties
    : [];

  const rooms = Array.isArray(source.rooms)
    ? source.rooms
    : [];

  return {
    days: [...days],
    slotsPerDay,
    slotTimings: normalizeSlotTimings(source.slotTimings, slotsPerDay),
    subjects: subjects.map((subject) => ({
      ...subject,
      maxPerDay: clampSubjectMaxPerDay(subject.maxPerDay),
    })),
    faculties: faculties.map((faculty) => ({
      ...faculty,
      canTeach: Array.isArray(faculty.canTeach)
        ? [...faculty.canTeach]
        : [],
      unavailableDays: Array.isArray(faculty.unavailableDays)
        ? faculty.unavailableDays.filter(Boolean)
        : [],
    })),
    rooms: rooms.map((room) => ({ ...room })),
  };
}

function getVariantSetupHints(constraints: SchedulerConstraints) {
  const hints: string[] = [];
  if (constraints.subjects.length === 0) {
    hints.push("Add at least one subject.");
  }
  if (constraints.faculties.length === 0) {
    hints.push("Add at least one faculty member.");
  }
  if (constraints.rooms.length === 0) {
    hints.push("Add at least one room.");
  }
  if (constraints.days.length === 0) {
    hints.push("Select at least one teaching day.");
  }
  if (constraints.slotsPerDay < 1) {
    hints.push("Set slots per day to at least 1.");
  }
  if (constraints.slotTimings.length !== constraints.slotsPerDay) {
    hints.push("Period timings must match slots per day.");
  }

  const hasBlankSubject = constraints.subjects.some((subject) => subject.name.trim().length === 0);
  if (hasBlankSubject) {
    hints.push("Each subject needs a name.");
  }

  const hasBlankFaculty = constraints.faculties.some((faculty) => faculty.name.trim().length === 0);
  if (hasBlankFaculty) {
    hints.push("Each faculty entry needs a name.");
  }

  const hasBlankRoom = constraints.rooms.some((room) => room.name.trim().length === 0);
  if (hasBlankRoom) {
    hints.push("Each room entry needs a room name.");
  }

  const totalSlots = constraints.days.length * constraints.slotsPerDay;
  const totalDemand = constraints.subjects.reduce(
    (sum, subject) => sum + Math.max(0, Number(subject.weeklyHours) || 0),
    0
  );

  if (totalDemand > totalSlots) {
    hints.push(
      `Weekly demand is ${totalDemand}, but timetable capacity is only ${totalSlots} (${constraints.days.length} day(s) x ${constraints.slotsPerDay} slot(s) per day). Reduce subject weekly hours or increase days/slots.`
    );
  }

  const subjectsOverDailyLimit = constraints.subjects
    .filter((subject) => {
      const perDayLimit = clampSubjectMaxPerDay(subject.maxPerDay);
      return subject.weeklyHours > Math.max(1, constraints.days.length * perDayLimit);
    })
    .map((subject) => subject.name);
  if (subjectsOverDailyLimit.length > 0) {
    hints.push(
      `Subject hours are too high for current day distribution. Reduce weekly hours or increase max/day.`
    );
  }

  const invalidSubjectDailyLimit = constraints.subjects.some(
    (subject) =>
      !Number.isFinite(subject.maxPerDay ?? NaN) ||
      (subject.maxPerDay ?? 2) < 1 ||
      (subject.maxPerDay ?? 2) > 6
  );
  if (invalidSubjectDailyLimit) {
    hints.push("Subject max/day must stay between 1 and 6.");
  }

  const unmappedSubjects = constraints.subjects
    .filter(
      (subject) =>
        !constraints.faculties.some((faculty) =>
          faculty.canTeach.includes(subject.name)
        )
    )
    .map((subject) => subject.name);
  if (unmappedSubjects.length > 0) {
    hints.push(`No faculty mapped for: ${unmappedSubjects.join(", ")}.`);
  }

  const invalidFacultyUnavailableDays = constraints.faculties.some((faculty) =>
    (faculty.unavailableDays ?? []).some((day) => !constraints.days.includes(day))
  );
  if (invalidFacultyUnavailableDays) {
    hints.push("Faculty unavailable day values must be selected teaching days.");
  }

  return hints;
}

function getSlotTimingsError(slotTimings: SlotTiming[]) {
  const labels = new Set<string>();
  let previousEnd = -1;
  for (let idx = 0; idx < slotTimings.length; idx += 1) {
    const slotTiming = slotTimings[idx];
    const start = timeStringToMinutes(slotTiming.start);
    const end = timeStringToMinutes(slotTiming.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return `Period ${idx + 1} has invalid timing.`;
    }
    const label = `${slotTiming.start}-${slotTiming.end}`;
    if (labels.has(label)) {
      return "Each period timing must be unique.";
    }
    labels.add(label);

    if (previousEnd >= 0 && start < previousEnd) {
      return "Periods must be in increasing order without overlap.";
    }
    previousEnd = end;
  }
  return null;
}

function hasCustomSlotTimings(slotTimings: SlotTiming[], slotsPerDay: number) {
  const defaults = normalizeSlotTimings(undefined, slotsPerDay);
  return slotTimings.some((slotTiming, idx) => {
    const fallback = defaults[idx];
    if (!fallback) return true;
    return slotTiming.start !== fallback.start || slotTiming.end !== fallback.end;
  });
}

function breakPriority(name: string) {
  const lower = name.trim().toLowerCase();
  if (lower.includes("lunch")) return 0;
  if (lower.includes("tea")) return 1;
  return 2;
}

function sortBreakRules(breaks: BreakRule[]) {
  return [...breaks].sort((a, b) => {
    if (a.afterSlot !== b.afterSlot) return a.afterSlot - b.afterSlot;
    const priorityGap = breakPriority(a.name) - breakPriority(b.name);
    if (priorityGap !== 0) return priorityGap;
    return a.name.localeCompare(b.name);
  });
}

function clampBreakSlot(slot: number, maxSlot: number) {
  return Math.max(1, Math.min(maxSlot, Math.trunc(slot)));
}

function suggestBreakAfterSlot(
  slotTimings: SlotTiming[],
  targetEndMinutes: number,
  minSlot = 1,
  maxSlotOverride?: number
) {
  const maxBreakSlot = Math.max(1, slotTimings.length - 1);
  const upperBound =
    typeof maxSlotOverride === "number"
      ? clampBreakSlot(maxSlotOverride, maxBreakSlot)
      : maxBreakSlot;
  const lowerBound = clampBreakSlot(minSlot, upperBound);
  let bestSlot = lowerBound;
  let bestDistance = Number.POSITIVE_INFINITY;

  slotTimings.forEach((slotTiming, index) => {
    const slotNumber = index + 1;
    if (slotNumber < lowerBound || slotNumber > upperBound) return;
    const endMinutes = timeStringToMinutes(slotTiming.end);
    if (!Number.isFinite(endMinutes)) return;
    const distance = Math.abs(endMinutes - targetEndMinutes);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSlot = slotNumber;
    }
  });

  return bestSlot;
}

function defaultBreaks(slotTimings: SlotTiming[]): BreakRule[] {
  const slotCount = slotTimings.length;
  const maxBreakSlot = Math.max(1, slotCount - 1);
  const breaks: BreakRule[] = [];

  if (slotCount >= 3) {
    const lunchAfter = suggestBreakAfterSlot(slotTimings, 13 * 60 + 15, 2);
    breaks.push({
      id: "break-lunch",
      name: "Lunch Break",
      afterSlot: clampBreakSlot(lunchAfter, maxBreakSlot),
    });
  }

  if (slotCount >= 5) {
    const lunchAfter = breaks[0]?.afterSlot ?? maxBreakSlot;
    const maxTeaSlot = Math.max(1, Math.min(maxBreakSlot, lunchAfter - 1));
    const teaAfter = suggestBreakAfterSlot(slotTimings, 11 * 60, 1, maxTeaSlot);
    if (teaAfter < lunchAfter) {
      breaks.push({
        id: "break-tea",
        name: "Tea Break",
        afterSlot: clampBreakSlot(teaAfter, maxTeaSlot),
      });
    }
  }

  return sortBreakRules(breaks);
}

function alignBreakRulesToTimings(slotTimings: SlotTiming[], breaks: BreakRule[]) {
  const slotCount = slotTimings.length;
  if (slotCount < 2) return [];

  const maxBreakSlot = Math.max(1, slotCount - 1);
  const lunchRule = breaks.find((breakRule) =>
    breakRule.name.trim().toLowerCase().includes("lunch")
  );
  const suggestedLunchAfter = lunchRule
    ? clampBreakSlot(suggestBreakAfterSlot(slotTimings, 13 * 60 + 15, 2), maxBreakSlot)
    : null;
  const suggestedTeaAfter = breaks.some((breakRule) =>
    breakRule.name.trim().toLowerCase().includes("tea")
  )
    ? clampBreakSlot(
      suggestBreakAfterSlot(
        slotTimings,
        11 * 60,
        1,
        suggestedLunchAfter ? Math.max(1, suggestedLunchAfter - 1) : maxBreakSlot
      ),
      suggestedLunchAfter ? Math.max(1, suggestedLunchAfter - 1) : maxBreakSlot
    )
    : null;

  const aligned = breaks.map((breakRule) => {
    const normalizedName = breakRule.name.trim();
    if (!normalizedName) return null;

    const lowerName = normalizedName.toLowerCase();
    if (lowerName.includes("lunch") && suggestedLunchAfter) {
      return { ...breakRule, name: normalizedName, afterSlot: suggestedLunchAfter };
    }
    if (
      lowerName.includes("tea") &&
      suggestedTeaAfter &&
      (!suggestedLunchAfter || suggestedTeaAfter < suggestedLunchAfter)
    ) {
      return { ...breakRule, name: normalizedName, afterSlot: suggestedTeaAfter };
    }
    return {
      ...breakRule,
      name: normalizedName,
      afterSlot: clampBreakSlot(breakRule.afterSlot, maxBreakSlot),
    };
  });

  const deduped: BreakRule[] = [];
  let lunchAdded = false;
  let teaAdded = false;
  const seen = new Set<string>();

  aligned.forEach((breakRule) => {
    if (!breakRule) return;
    const lower = breakRule.name.toLowerCase();

    if (lower.includes("lunch")) {
      if (lunchAdded) return;
      lunchAdded = true;
    }
    if (lower.includes("tea")) {
      if (teaAdded) return;
      teaAdded = true;
    }

    const key = `${breakRule.afterSlot}|${lower}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(breakRule);
  });

  return sortBreakRules(deduped);
}

function getBreakDisplayLabel(breakRule: BreakRule, slotTimings: SlotTiming[]) {
  const slotBeforeBreak = slotTimings[breakRule.afterSlot - 1];
  const slotAfterBreak = slotTimings[breakRule.afterSlot];
  if (!slotBeforeBreak || !slotAfterBreak) return breakRule.name;
  return `${breakRule.name} (${slotBeforeBreak.end}-${slotAfterBreak.start})`;
}

type PreviewColumn =
  | { kind: "slot"; label: string }
  | { kind: "break"; label: string };

function buildPreviewColumns(slotTimings: SlotTiming[], breaks: BreakRule[]): PreviewColumn[] {
  const slotLabels = createSlotLabels(slotTimings);
  const sortedBreaks = sortBreakRules(breaks);
  const columns: PreviewColumn[] = [];

  slotLabels.forEach((slotLabel, index) => {
    const slotNumber = index + 1;
    columns.push({ kind: "slot", label: slotLabel });
    sortedBreaks
      .filter((breakRule) => breakRule.afterSlot === slotNumber)
      .forEach((breakRule) =>
        columns.push({ kind: "break", label: getBreakDisplayLabel(breakRule, slotTimings) })
      );
  });

  return columns;
}

interface SchedulerDraft {
  constraints: SchedulerConstraints;
  breaks: BreakRule[];
  variants: TimetableVariant[];
  activeVariantId: string | null;
  variantCount: number;
  savedAt: string;
}

interface GenerateVariantsResponse {
  message?: string;
  warning?: string | null;
  limitingFactors?: string[];
  requestedCount?: number;
  generatedCount?: number;
  variants?: TimetableVariant[];
}

export function SchedulerPage() {
  const router = useRouter();
  const [billingPlan, setBillingPlan] = useState<PlanId>("free");
  const [billingFeatures, setBillingFeatures] = useState<PlanFeatures>(
    DEFAULT_BILLING_FEATURES
  );
  const [billingLoading, setBillingLoading] = useState(true);
  const [constraints, setConstraints] = useState<SchedulerConstraints>(() =>
    normalizeConstraintsState(EMPTY_INITIAL_CONSTRAINTS)
  );
  const [breaks, setBreaks] = useState<BreakRule[]>([]);
  const [variants, setVariants] = useState<TimetableVariant[]>([]);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [variantCount, setVariantCount] = useState(0);
  const [brandingConfig, setBrandingConfig] = useState<BrandingConfig | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [variantGenerationHint, setVariantGenerationHint] = useState<string | null>(null);
  const [lastLimitingFactors, setLastLimitingFactors] = useState<string[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const planVariantLimit = billingFeatures.maxVariants;
  const variantInputLimit = planVariantLimit ?? MAX_VARIANT_INPUT_VALUE;

  const activeVariant = useMemo(
    () => variants.find((variant) => variant.id === activeVariantId) ?? variants[0],
    [variants, activeVariantId]
  );

  const slotLabels = useMemo(
    () => createSlotLabels(constraints.slotTimings),
    [constraints.slotTimings]
  );
  const previewColumns = useMemo(
    () => buildPreviewColumns(constraints.slotTimings, breaks),
    [constraints.slotTimings, breaks]
  );
  const timingError = useMemo(
    () => getSlotTimingsError(constraints.slotTimings),
    [constraints.slotTimings]
  );
  const hasAdvancedCustomTimings = useMemo(
    () => hasCustomSlotTimings(constraints.slotTimings, constraints.slotsPerDay),
    [constraints.slotTimings, constraints.slotsPerDay]
  );
  const plannerSummary = useMemo(() => {
    const weeklyDemandHours = constraints.subjects.reduce(
      (total, subject) => total + Math.max(0, Number(subject.weeklyHours) || 0),
      0
    );
    const weeklyCapacity = constraints.days.length * constraints.slotsPerDay;
    const mappedSubjectSet = new Set<string>();

    constraints.faculties.forEach((faculty) => {
      faculty.canTeach.forEach((subject) => {
        if (constraints.subjects.some((item) => item.name === subject)) {
          mappedSubjectSet.add(subject);
        }
      });
    });

    return {
      weeklyDemandHours,
      weeklyCapacity,
      mappedSubjects: mappedSubjectSet.size,
    };
  }, [constraints.days.length, constraints.faculties, constraints.slotsPerDay, constraints.subjects]);
  const variantSetupHints = useMemo(
    () => getVariantSetupHints(constraints),
    [constraints]
  );
  const plannerHints = useMemo(() => {
    const hints: string[] = [];
    if (variantCount < 1) {
      hints.push("Set variants to at least 1 to generate timetable options.");
    }
    if (planVariantLimit !== null && variantCount > planVariantLimit) {
      hints.push(
        `Your ${billingPlan} plan allows up to ${planVariantLimit} variants per generation.`
      );
    }
    if (timingError) {
      hints.push(timingError);
    }
    hints.push(...variantSetupHints);
    return Array.from(new Set(hints));
  }, [
    billingPlan,
    hasAdvancedCustomTimings,
    planVariantLimit,
    timingError,
    variantCount,
    variantSetupHints,
  ]);

  useEffect(() => {
    let cancelled = false;

    const applyBilling = (payload: BillingSummary) => {
      if (cancelled) return;
      const nextPlan =
        payload.currentPlan === "pro" || payload.currentPlan === "department" || payload.currentPlan === "institution"
          ? payload.currentPlan
          : "free";
      const nextFeatures = payload.features ?? DEFAULT_BILLING_FEATURES;

      setBillingPlan(nextPlan);
      setBillingFeatures(nextFeatures);
      setVariantCount((prev) => clampVariantCountForPlan(prev, nextFeatures.maxVariants));
    };

    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(BILLING_CACHE_KEY);
      if (cached) {
        try {
          applyBilling(JSON.parse(cached) as BillingSummary);
        } catch {
          sessionStorage.removeItem(BILLING_CACHE_KEY);
        }
      }
    }

    const loadBilling = async () => {
      try {
        const response = await fetch("/api/billing", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as BillingSummary;
        applyBilling(payload);
      } catch (error) {
        console.error("Failed to load billing features for scheduler:", error);
      } finally {
        if (!cancelled) {
          setBillingLoading(false);
        }
      }
    };

    void loadBilling();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    async function loadBranding() {
      try {
        const response = await fetch("/api/profile/branding");
        if (response.ok) {
          const payload = await response.json();
          if (payload.branding) setBrandingConfig(payload.branding);
        }
      } catch (err) {
        console.error("Failed to load branding in scheduler", err);
      }
    }
    if (billingFeatures?.whiteLabel) {
      loadBranding();
    }
  }, [billingFeatures?.whiteLabel]);

  useEffect(() => {
    const draftRaw =
      localStorage.getItem(SCHEDULER_DRAFT_KEY) ??
      localStorage.getItem(LEGACY_DRAFT_KEY);

    if (draftRaw) {
      try {
        const parsed = JSON.parse(draftRaw) as Partial<SchedulerDraft>;
        if (parsed.constraints) {
          setConstraints(normalizeConstraintsState(parsed.constraints));
        }
        if (Array.isArray(parsed.breaks)) {
          const referenceSlotTimings = parsed.constraints
            ? normalizeConstraintsState(parsed.constraints).slotTimings
            : EMPTY_INITIAL_CONSTRAINTS.slotTimings;
          setBreaks(alignBreakRulesToTimings(referenceSlotTimings, parsed.breaks));
        }
        if (Array.isArray(parsed.variants)) {
          setVariants(parsed.variants);
        }
        if (typeof parsed.activeVariantId === "string" || parsed.activeVariantId === null) {
          setActiveVariantId(parsed.activeVariantId);
        }
        if (typeof parsed.variantCount === "number") {
          setVariantCount(clampVariantCount(parsed.variantCount));
        }
        if (typeof parsed.savedAt === "string") {
          setDraftSavedAt(parsed.savedAt);
        }
      } catch {
        localStorage.removeItem(SCHEDULER_DRAFT_KEY);
        localStorage.removeItem(LEGACY_DRAFT_KEY);
      }
      return;
    }

    const savedConstraints = localStorage.getItem(CONSTRAINTS_KEY);
    if (savedConstraints) {
      try {
        setConstraints(normalizeConstraintsState(JSON.parse(savedConstraints)));
      } catch {
        localStorage.removeItem(CONSTRAINTS_KEY);
      }
    }
  }, []);

  useEffect(() => {
    setBreaks((prev) => alignBreakRulesToTimings(constraints.slotTimings, prev));
  }, [constraints.slotTimings]);

  useEffect(() => {
    setVariantGenerationHint(null);
  }, [constraints, variantCount]);

  const persistDraft = useCallback(
    (showToast = false) => {
      setAutosaveState("saving");
      try {
        const payload: SchedulerDraft = {
          constraints,
          breaks,
          variants,
          activeVariantId,
          variantCount,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(SCHEDULER_DRAFT_KEY, JSON.stringify(payload));
        localStorage.setItem(CONSTRAINTS_KEY, JSON.stringify(constraints));
        setDraftSavedAt(payload.savedAt);
        setAutosaveState("saved");
        if (showToast) toast.success("Draft saved.");
      } catch {
        setAutosaveState("idle");
        toast.error("Unable to save draft in browser storage.");
        return;
      }
      setTimeout(() => setAutosaveState("idle"), 1200);
    },
    [activeVariantId, breaks, constraints, variantCount, variants]
  );

  async function generateVariants() {
    const normalizedVariantCount = clampVariantCountForPlan(
      variantCount,
      planVariantLimit
    );
    if (normalizedVariantCount !== variantCount) {
      setVariantCount(normalizedVariantCount);
    }
    const generationHints: string[] = [];
    if (normalizedVariantCount < 1) {
      generationHints.push("Set variants to at least 1 before generating.");
    }
    if (planVariantLimit !== null && variantCount > planVariantLimit) {
      generationHints.push(
        `Your ${billingPlan} plan allows up to ${planVariantLimit} variants per generation.`
      );
    }
    if (constraints.slotsPerDay < 1) {
      generationHints.push("Set slots per day to at least 1 before generating.");
    }
    if (timingError) {
      generationHints.push(timingError);
    }
    if (variantSetupHints.length > 0) {
      generationHints.push(variantSetupHints[0]);
    }
    if (generationHints.length > 0) {
      const hintMessage = generationHints.join(" ");
      setVariantGenerationHint(hintMessage);
      toast.error(generationHints[0]);
      return;
    }

    setIsGenerating(true);
    setVariantGenerationHint(null);
    try {
      const response = await fetch("/api/scheduler/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ constraints, count: normalizedVariantCount }),
      });
      const payload = (await response
        .json()
        .catch(() => null)) as GenerateVariantsResponse | null;

      if (!response.ok) {
        const details =
          Array.isArray(payload?.limitingFactors) && payload.limitingFactors.length > 0
            ? ` ${payload.limitingFactors.join(" ")}`
            : "";
        const message =
          payload?.message ??
          "Unable to generate variants. Please retry in a few seconds.";
        setVariantGenerationHint(`${message}${details}`);
        toast.error(message);
        return;
      }
      if (!payload) {
        const message =
          "Generation failed: server returned an empty response. Please try again.";
        setVariantGenerationHint(message);
        toast.error(message);
        return;
      }

      setLastLimitingFactors(Array.isArray(payload.limitingFactors) ? payload.limitingFactors : []);

      const normalized: TimetableVariant[] = (payload.variants ?? []).map(
        (variant, index) => ({
          ...variant,
          name: `Variant ${index + 1}`,
        })
      );

      setVariants(normalized);
      setActiveVariantId(normalized[0]?.id ?? null);

      const warning =
        typeof payload.warning === "string" && payload.warning.trim().length > 0
          ? payload.warning
          : null;
      if (warning) {
        const factorText =
          Array.isArray(payload.limitingFactors) && payload.limitingFactors.length > 0
            ? ` ${payload.limitingFactors.join(" ")}`
            : "";
        const fullHint = `${warning}${factorText}`;
        setVariantGenerationHint(fullHint);
        toast.warning(warning);
      } else {
        const countLabel = normalized.length === 1 ? "variant" : "variants";
        toast.success(`Generated ${normalized.length} ${countLabel}.`);
        if (typeof window !== "undefined") {
          localStorage.setItem("schedulr.dashboard.needsRefresh", "true");
        }
      }
    } catch (error) {
      console.error("Generate request failed:", error);
      const message =
        "Generation failed due to a network or server error. Please try again.";
      setVariantGenerationHint(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  function updateSubject(index: number, patch: Partial<SubjectConstraint>) {
    setConstraints((prev) => ({
      ...prev,
      subjects: prev.subjects.map((subject, idx) =>
        idx === index ? { ...subject, ...patch } : subject
      ),
    }));
  }

  function updateFaculty(index: number, patch: Partial<FacultyConstraint>) {
    setConstraints((prev) => ({
      ...prev,
      faculties: prev.faculties.map((faculty, idx) =>
        idx === index ? { ...faculty, ...patch } : faculty
      ),
    }));
  }

  function updateRoom(index: number, patch: Partial<RoomConstraint>) {
    setConstraints((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room, idx) => (idx === index ? { ...room, ...patch } : room)),
    }));
  }

  function updateSlotTiming(index: number, patch: Partial<SlotTiming>) {
    setConstraints((prev) => ({
      ...prev,
      slotTimings: prev.slotTimings.map((slotTiming, idx) =>
        idx === index ? { ...slotTiming, ...patch } : slotTiming
      ),
    }));
  }

  function resetSlotTimingsToDefault() {
    setConstraints((prev) => ({
      ...prev,
      slotTimings: normalizeSlotTimings(undefined, prev.slotsPerDay),
    }));
  }

  function removeSubject(index: number) {
    setConstraints((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, idx) => idx !== index),
    }));
  }

  function removeFaculty(index: number) {
    setConstraints((prev) => ({
      ...prev,
      faculties: prev.faculties.filter((_, idx) => idx !== index),
    }));
  }

  function removeRoom(index: number) {
    setConstraints((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((_, idx) => idx !== index),
    }));
  }

  function addBreak() {
    if (constraints.slotTimings.length < 2) {
      toast.error("Add at least 2 slots per day before adding a break.");
      return;
    }
    setBreaks((prev) =>
      sortBreakRules([
        ...prev,
        {
          id: `break-${Date.now()}`,
          name: `Break ${prev.length + 1}`,
          afterSlot: suggestBreakAfterSlot(constraints.slotTimings, 15 * 60),
        },
      ])
    );
  }

  function updateBreak(index: number, patch: Partial<BreakRule>) {
    setBreaks((prev) =>
      sortBreakRules(
        prev.map((breakRule, idx) => (idx === index ? { ...breakRule, ...patch } : breakRule))
      )
    );
  }

  function removeBreak(id: string) {
    setBreaks((prev) => prev.filter((breakRule) => breakRule.id !== id));
  }

  function loadComplexMockData() {
    // Deep clone to ensure pristine test data on repeated clicks
    const mockData = JSON.parse(JSON.stringify(COMPLEX_MOCK_CONSTRAINTS));
    const normalizedData = normalizeConstraintsState(mockData);
    const mockBreaks = defaultBreaks(normalizedData.slotTimings);
    const variantCountToSet = clampVariantCountForPlan(COMPLEX_MOCK_VARIANT_COUNT, planVariantLimit);

    setConstraints(normalizedData);
    setBreaks(mockBreaks);
    setVariants([]);
    setActiveVariantId(null);
    setVariantCount(variantCountToSet);
    setVariantGenerationHint(null);

    // Persist immediately so it is "synced properly"
    setAutosaveState("saving");
    try {
      const payload: SchedulerDraft = {
        constraints: normalizedData,
        breaks: mockBreaks,
        variants: [],
        activeVariantId: null,
        variantCount: variantCountToSet,
        savedAt: new Date().toISOString(),
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(SCHEDULER_DRAFT_KEY, JSON.stringify(payload));
        localStorage.setItem(CONSTRAINTS_KEY, JSON.stringify(normalizedData));
      }
      setDraftSavedAt(payload.savedAt);
      setAutosaveState("saved");
    } catch {
      setAutosaveState("idle");
    }
    setTimeout(() => setAutosaveState("idle"), 1200);

    toast.success("Complex test data loaded & saved. Click Generate to test.");
  }

  function clearSchedulerData() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Clear all inserted scheduler data (subjects, faculty, rooms, draft, and generated variants)?"
      );
      if (!confirmed) return;
    }

    const clearedConstraints = normalizeConstraintsState(EMPTY_INITIAL_CONSTRAINTS);
    const clearedDraft: SchedulerDraft = {
      constraints: clearedConstraints,
      breaks: [],
      variants: [],
      activeVariantId: null,
      variantCount: 0,
      savedAt: new Date().toISOString(),
    };

    setConstraints(clearedConstraints);
    setBreaks([]);
    setVariants([]);
    setActiveVariantId(null);
    setVariantCount(0);
    setVariantGenerationHint(null);
    setDraftSavedAt(clearedDraft.savedAt);
    setAutosaveState("idle");

    if (typeof window !== "undefined") {
      localStorage.setItem(SCHEDULER_DRAFT_KEY, JSON.stringify(clearedDraft));
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      localStorage.setItem(CONSTRAINTS_KEY, JSON.stringify(clearedConstraints));
    }

    toast.success("All inserted scheduler data cleared.");
  }

  function handleNormalizeTimings() {
    const normalized = normalizeSlotTimings(constraints.slotTimings, constraints.slotsPerDay);
    const changedCount = normalized.reduce((count, slot, index) => {
      const current = constraints.slotTimings[index];
      if (!current) return count + 1;
      if (current.start !== slot.start || current.end !== slot.end) return count + 1;
      return count;
    }, 0);

    if (changedCount === 0) {
      toast.message("Timings are already normalized.");
      return;
    }

    setConstraints((prev) => ({
      ...prev,
      slotTimings: normalized,
    }));
    toast.success(`Normalized ${changedCount} period${changedCount > 1 ? "s" : ""}.`);
  }

  function handleResetBreakSuggestions() {
    setBreaks(defaultBreaks(constraints.slotTimings));
    toast.success("Break suggestions reset.");
  }

  function handleBulkImport(imported: Partial<SchedulerConstraints>) {

    const nextSubjects = Array.isArray(imported.subjects) ? imported.subjects : null;
    const nextFaculties = Array.isArray(imported.faculties) ? imported.faculties : null;
    const nextRooms = Array.isArray(imported.rooms) ? imported.rooms : null;

    setConstraints((prev) => {
      return {
        ...prev,
        subjects: nextSubjects ?? prev.subjects,
        faculties: nextFaculties ?? prev.faculties,
        rooms: nextRooms ?? prev.rooms,
      };
    });
    setVariants([]);
    setActiveVariantId(null);
    setVariantGenerationHint(null);

    toast.success("Imported data applied. Subjects, faculty, and rooms were replaced.");
  }

  async function handleExport(type: "pdf" | "excel") {
    if (!activeVariant) return;
    setExporting(type);
    const exportOptions = {
      days: constraints.days,
      slotLabels,
      breaks,
    };
    try {
      if (type === "pdf") {
        await exportVariantToPdf(activeVariant, exportOptions, brandingConfig);
      }
      if (type === "excel") {
        await exportVariantToExcel(activeVariant, exportOptions);
      }
      toast.success(`${type.toUpperCase()} exported.`);
    } catch {
      toast.error(`Failed to export ${type.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  }

  async function handleExportAll(type: "pdf" | "excel") {
    if (variants.length === 0) return;
    if (type === "pdf" && !billingFeatures.bulkGeneration) {
      toast.error("Bulk PDF export is available on Pro plans and above.");
      return;
    }
    if (type === "excel" && !billingFeatures.bulkGeneration) {
      toast.error("Bulk Excel export is available on Pro plans and above.");
      return;
    }

    setExporting(type);
    const exportOptions = {
      days: constraints.days,
      slotLabels,
      breaks,
    };
    try {
      if (type === "pdf") {
        await exportAllVariantsToPdfZip(variants, exportOptions, brandingConfig);
      }
      if (type === "excel") {
        await exportAllVariantsToExcelZip(variants, exportOptions);
      }
      toast.success(
        type === "pdf"
          ? "All variants downloaded as separate PDF files in a ZIP folder."
          : "All variants downloaded as separate Excel files in a ZIP folder."
      );
    } catch {
      toast.error(`Failed to export all ${type.toUpperCase()} files.`);
    } finally {
      setExporting(null);
    }
  }

  function handleEmergencyVariantApplied(appliedVariant: TimetableVariant) {
    setVariants((prev) => [appliedVariant, ...prev.filter((variant) => variant.id !== appliedVariant.id)]);
    setActiveVariantId(appliedVariant.id);
    setVariantGenerationHint(null);
  }

  return (
    <div className="space-y-6">
      {billingFeatures.showAds ? (
        <Card className="surface-card border-amber-300/50 bg-amber-50/70 dark:bg-amber-950/20">
          <CardContent className="p-3 text-sm text-amber-800 dark:text-amber-100">
            Sponsored: Upgrade to Pro to remove ads and unlock bulk export features.
          </CardContent>
        </Card>
      ) : null}

      <PageHeader
        title="Timetable Scheduler"
        subtitle={`Plan: ${billingPlan.toUpperCase()}${
          planVariantLimit === null ? " | Variants: Unlimited" : ` | Variants per generation: up to ${planVariantLimit}`
        }`}
        action={
          <div className="flex w-full max-w-full flex-wrap items-start gap-2 lg:justify-end">
            <BulkImportDialog
              onImport={handleBulkImport}
              disabled={false}
            />
            <div className="w-full max-w-[360px] rounded-md border border-brand-border bg-card px-2 py-1 shadow-sm sm:w-auto">
              <div className="inline-flex items-center">
                <span className="mr-2 text-xs text-brand-text-secondary">Variants</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={variantInputLimit}
                  step={1}
                  value={variantCount}
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    if (rawValue === "") {
                      setVariantCount(0);
                      return;
                    }
                    setVariantCount(
                      clampVariantCountForPlan(Number(rawValue), planVariantLimit)
                    );
                  }}
                  className="h-7 w-16 border-0 bg-transparent px-1 text-center shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Number of variants to generate"
                />
                <div className="ml-1 flex flex-col gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-3.5 w-5 rounded-sm p-0"
                    onClick={() =>
                      setVariantCount((prev) =>
                        clampVariantCountForPlan(prev + 1, planVariantLimit)
                      )
                    }
                    aria-label="Increase variants"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-3.5 w-5 rounded-sm p-0"
                    onClick={() =>
                      setVariantCount((prev) =>
                        clampVariantCountForPlan(prev - 1, planVariantLimit)
                      )
                    }
                    aria-label="Decrease variants"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {variantGenerationHint ? (
                <p className="mt-1 text-[11px] leading-relaxed text-amber-600">
                  {variantGenerationHint}
                </p>
              ) : null}
              {variantSetupHints.length > 0 ? (
                <p className="mt-1 text-[11px] leading-relaxed text-destructive">
                  Setup hint: {variantSetupHints[0]}
                </p>
              ) : null}
              {planVariantLimit !== null ? (
                <p className="mt-1 text-[11px] leading-relaxed text-brand-text-secondary">
                  Max for {billingPlan}: {planVariantLimit}
                </p>
              ) : null}
            </div>
            <Button variant="outline" className="h-9" onClick={loadComplexMockData}>
              <Wand2 className="mr-2 h-4 w-4" />
              Load Test Data
            </Button>
            <Button variant="outline" className="h-9" onClick={() => persistDraft(true)}>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button variant="outline" className="h-9" onClick={clearSchedulerData}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Data
            </Button>
            <Button variant="outline" className="h-9 border-purple-500/20 text-purple-400 hover:bg-purple-500/10" onClick={() => setHistoryDrawerOpen(true)}>
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
            <Button variant="outline" className="h-9 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10" onClick={() => setTemplatesDialogOpen(true)}>
              <LayoutTemplate className="mr-2 h-4 w-4" />
              Templates
            </Button>
            <Button variant="outline" className="h-9 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10" onClick={() => setCalendarDialogOpen(true)} disabled={!activeVariant}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Calendar
            </Button>
            <Button
              className="h-9"
              onClick={generateVariants}
              disabled={isGenerating || billingLoading}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isGenerating
                ? "Generating..."
                : billingLoading
                ? "Loading plan..."
                : "Generate"}
            </Button>
          </div>
        }
      />

      <Card className="surface-card">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Table2 className="h-4 w-4 text-secondary" />
              Timetable Preview
            </CardTitle>
            <div className="w-[220px]">
              <Label className="mb-1 block text-xs text-brand-text-secondary">Variant Preview</Label>
              <Select
                value={activeVariant?.id ?? ""}
                onValueChange={(value) => setActiveVariantId(value)}
                disabled={variants.length === 0}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent className="max-h-44 [&_[data-radix-select-viewport]]:max-h-44 [&_[data-radix-select-viewport]]:overflow-y-auto">
                  {variants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-brand-text-secondary">
              {activeVariant ? `Score: ${activeVariant.score}%` : "Generate variants to preview."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="border-brand-border"
              onClick={() => handleExport("pdf")}
              disabled={!activeVariant || exporting !== null}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === "pdf" ? "Exporting PDF..." : "Export PDF"}
            </Button>
            <Button
              variant="outline"
              className="border-brand-border"
              onClick={() => handleExport("excel")}
              disabled={!activeVariant || exporting !== null}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === "excel" ? "Exporting Excel..." : "Export Excel"}
            </Button>
            <Button
              variant="outline"
              className="border-brand-border gap-1.5"
              onClick={() => {
                if (!activeVariant) return;
                setShareDialogOpen(true);
              }}
              disabled={!activeVariant}
            >
              <Link2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            variant={activeVariant}
            constraints={constraints}
            days={constraints.days}
            slotLabels={slotLabels}
          />
          {/* Conflict Explainer — shown when limiting factors exist */}
          {lastLimitingFactors.length > 0 || (activeVariant && activeVariant.score < 70) ? (
            <ConflictExplainerCard
              messages={explainDiagnostics(lastLimitingFactors, constraints, activeVariant?.score)}
              onScrollToSection={(section) => {
                const el = document.getElementById(`constraint-${section}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          ) : null}
          {isGenerating ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeVariant?.id ?? "empty"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <div className="thin-scrollbar max-h-[430px] overflow-auto rounded-md border border-slate-900/90 dark:border-slate-500/70">
                  <Table className="border-collapse">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow>
                        <TableHead className="w-36 min-w-[140px] border border-slate-900/90 bg-slate-100/80 text-brand-text dark:border-slate-500/70 dark:bg-slate-800/65">
                          Day
                        </TableHead>
                        {previewColumns.map((column) => (
                          <TableHead
                            key={`${column.kind}-${column.label}`}
                            className={
                              column.kind === "break"
                                ? "min-w-[130px] border border-slate-900/90 bg-blue-50/70 text-center text-brand-navy dark:border-slate-500/70 dark:bg-blue-900/35 dark:text-blue-100"
                                : "min-w-[130px] border border-slate-900/90 bg-slate-100/80 text-brand-text dark:border-slate-500/70 dark:bg-slate-800/65"
                            }
                          >
                            {column.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {constraints.days.map((day, rowIndex) => (
                        <TableRow
                          key={day}
                          className={rowIndex % 2 ? "bg-slate-50/75 hover:bg-slate-50/75 dark:bg-slate-900/25 dark:hover:bg-slate-900/25" : "hover:bg-transparent"}
                        >
                          <TableCell className="border border-slate-900/90 bg-slate-50/70 font-semibold text-brand-text dark:border-slate-500/70 dark:bg-slate-800/35">
                            {day}
                          </TableCell>
                          {previewColumns.map((column) => {
                            if (column.kind === "break") {
                              return (
                                <TableCell
                                  key={`${day}-${column.label}`}
                                  className="border border-slate-900/90 bg-blue-50/70 text-center text-xs font-semibold text-brand-navy dark:border-slate-500/70 dark:bg-blue-900/35 dark:text-blue-100"
                                >
                                  -
                                </TableCell>
                              );
                            }
                            const slot = activeVariant?.slots.find(
                              (candidate) => candidate.day === day && candidate.slotLabel === column.label
                            );
                            return (
                              <TableCell
                                key={`${day}-${column.label}`}
                                className="border border-slate-900/90 bg-white/95 align-top text-xs dark:border-slate-500/70 dark:bg-slate-900/20"
                              >
                                {slot ? (
                                  <div>
                                    <p className="font-semibold text-brand-text">{slot.subject}</p>
                                    <p className="text-brand-text-secondary">{slot.faculty}</p>
                                    <p className="text-muted-foreground">{slot.room}</p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* AI Insights Card */}
      <AIInsightsCard
        activeVariant={activeVariant}
        constraints={constraints}
        billingFeatures={billingFeatures}
      />

      {billingFeatures.emergencyReschedule ? (
        <EmergencyReschedulerCard
          constraints={constraints}
          activeVariant={activeVariant ?? null}
          onVariantApplied={handleEmergencyVariantApplied}
        />
      ) : (
        <Card className="surface-card border-brand-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Dynamic Emergency Rescheduling</CardTitle>
            <p className="text-sm text-brand-text-secondary">
              This feature is available on Pro plans and above.
            </p>
          </CardHeader>
        </Card>
      )}

      <Card className="surface-card">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="h-4 w-4 text-secondary" />
              Constraints
            </CardTitle>
            <p className="mt-1 text-sm text-brand-text-secondary">
              Compact two-column layout for quick editing.
            </p>
          </div>
          <div className="text-xs text-brand-text-secondary">
            {autosaveState === "saving" ? (
              <span className="inline-flex items-center gap-1">
                <Save className="h-3.5 w-3.5 animate-pulse" />
                Saving...
              </span>
            ) : autosaveState === "saved" ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            ) : (
              <span>
                {draftSavedAt
                  ? `Draft saved at ${new Date(draftSavedAt).toLocaleTimeString()}`
                  : "Draft not saved yet"}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-3">
              <h3 className="mb-2 text-sm font-semibold text-brand-text">Subjects</h3>
              <p className="mb-2 text-xs text-brand-text-secondary">
                Hint: Add subject name and weekly hours. Example: Mathematics - 4 hrs/week.
              </p>
              <div className="thin-scrollbar max-h-56 space-y-2 overflow-y-auto pr-1">
                {constraints.subjects.map((subject, idx) => (
                  <div key={`subject-${idx}`} className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-start">
                    <div className="flex-1">
                      <Label className="mb-1 block text-xs">Name</Label>
                      <Input
                        placeholder="e.g. Mathematics"
                        value={subject.name}
                        onChange={(event) => updateSubject(idx, { name: event.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:w-auto sm:flex-none">
                      <div>
                        <Label className="mb-1 block text-xs">Hours</Label>
                        <Input
                          type="number"
                          min={1}
                          max={8}
                          value={subject.weeklyHours}
                          onChange={(event) =>
                            updateSubject(idx, { weeklyHours: Number(event.target.value) || 1 })
                          }
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">Max/day</Label>
                        <Input
                          type="number"
                          min={1}
                          max={6}
                          disabled={false}
                          title={"Maximum classes for this subject per day."}
                          value={clampSubjectMaxPerDay(subject.maxPerDay)}
                          onChange={(event) =>
                            updateSubject(idx, {
                              maxPerDay: clampSubjectMaxPerDay(Number(event.target.value)),
                            })
                          }
                        />
                      </div>
                      <div className="self-end">
                        <Button variant="ghost" size="icon" className="w-full text-destructive" onClick={() => removeSubject(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="mt-2 h-8"
                onClick={() =>
                  setConstraints((prev) => ({
                    ...prev,
                    subjects: [
                      ...prev.subjects,
                      { name: "", weeklyHours: 1, maxPerDay: 2 },
                    ],
                  }))
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Subject
              </Button>
            </div>

            <div className="rounded-lg border bg-card p-3">
              <h3 className="mb-2 text-sm font-semibold text-brand-text">Faculties</h3>
              <p className="mb-2 text-xs text-brand-text-secondary">
                Hint: Add faculty name and select subjects they can teach.
              </p>
              <div className="thin-scrollbar max-h-64 space-y-2 overflow-y-auto pr-1">
                {constraints.faculties.map((faculty, idx) => (
                  <div key={`faculty-${idx}`} className="space-y-2 rounded-md border p-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <div className="flex-1">
                        <Label className="mb-1 block text-xs">Faculty</Label>
                        <Input
                          placeholder="e.g. Prof. Kumar"
                          value={faculty.name}
                          onChange={(event) => updateFaculty(idx, { name: event.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex-none">
                        <div className="self-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-full text-blue-400 hover:text-blue-500"
                            title={`Copy shareable link for ${faculty.name || 'this faculty'}`}
                            disabled={!activeVariant || !faculty.name.trim()}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!activeVariant || !faculty.name.trim()) return;
                              try {
                                const res = await fetch('/api/share', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    variant: activeVariant,
                                    constraints,
                                    days: constraints.days,
                                    slotLabels,
                                  }),
                                });
                                if (!res.ok) throw new Error();
                                const data = await res.json();
                                const facultyUrl = `${data.shareUrl}?faculty=${encodeURIComponent(faculty.name)}`;
                                await navigator.clipboard.writeText(facultyUrl);
                                toast.success(`Link for ${faculty.name} copied!`);
                              } catch {
                                toast.error('Failed to generate faculty link.');
                              }
                            }}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="self-end">
                          <Button variant="ghost" size="icon" className="w-full text-destructive" onClick={() => removeFaculty(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {constraints.subjects.map((subject) => {
                        const checked = faculty.canTeach.includes(subject.name);
                        return (
                          <label
                            key={`${faculty.name}-${subject.name}`}
                            className="flex items-center gap-2 rounded-md border p-2 text-xs"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                const set = new Set(faculty.canTeach);
                                if (value) set.add(subject.name);
                                else set.delete(subject.name);
                                updateFaculty(idx, { canTeach: Array.from(set) });
                              }}
                            />
                            {subject.name}
                          </label>
                        );
                      })}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-brand-text-secondary">
                        Unavailable days (advanced)
                      </p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {dayOptions.map((day) => {
                          const unavailable = (faculty.unavailableDays ?? []).includes(day);
                          return (
                            <label
                              key={`${faculty.name}-${day}-unavailable`}
                              className="flex items-center gap-2 rounded-md border p-2 text-xs"
                            >
                              <Checkbox
                                disabled={false}
                                checked={unavailable}
                                onCheckedChange={(value) => {
                                  const set = new Set(faculty.unavailableDays ?? []);
                                  if (value) set.add(day);
                                  else set.delete(day);
                                  updateFaculty(idx, { unavailableDays: Array.from(set) });
                                }}
                              />
                              {day}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="mt-2 h-8"
                onClick={() =>
                  setConstraints((prev) => ({
                    ...prev,
                    faculties: [
                      ...prev.faculties,
                      { name: "", canTeach: [], unavailableDays: [] },
                    ],
                  }))
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Faculty
              </Button>
            </div>

            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-text">Planner Summary</h3>
                <Badge
                  variant={plannerHints.length > 0 ? "destructive" : "secondary"}
                  className="rounded-full px-2.5 py-0.5 text-[11px]"
                >
                  {plannerHints.length > 0 ? `Needs ${plannerHints.length} fix${plannerHints.length > 1 ? "es" : ""}` : "Ready"}
                </Badge>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border p-2">
                  <p className="text-[11px] text-brand-text-secondary">Subjects</p>
                  <p className="text-sm font-semibold text-brand-text">{constraints.subjects.length}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-[11px] text-brand-text-secondary">Faculty</p>
                  <p className="text-sm font-semibold text-brand-text">{constraints.faculties.length}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-[11px] text-brand-text-secondary">Weekly Demand</p>
                  <p className="text-sm font-semibold text-brand-text">{plannerSummary.weeklyDemandHours} hrs</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-[11px] text-brand-text-secondary">Weekly Capacity</p>
                  <p className="text-sm font-semibold text-brand-text">{plannerSummary.weeklyCapacity} slots</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-brand-text-secondary">
                Subject mapping: {plannerSummary.mappedSubjects}/{constraints.subjects.length || 0} subjects have at least one faculty.
              </p>
              {plannerHints.length > 0 ? (
                <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 p-2">
                  <p className="text-[11px] font-semibold text-destructive">Planner hints</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-destructive">
                    {plannerHints.slice(0, 4).map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                  </ul>
                  {plannerHints.length > 4 ? (
                    <p className="mt-1 text-[11px] text-destructive">
                      +{plannerHints.length - 4} more hint{plannerHints.length - 4 > 1 ? "s" : ""}.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-xs text-emerald-600">
                  All checks passed. Planner is ready for generation and export.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-8 border-brand-border text-xs hover:border-secondary/60 hover:bg-secondary/10"
                  onClick={handleNormalizeTimings}
                >
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  Normalize Timings
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 border-brand-border text-xs hover:border-secondary/60 hover:bg-secondary/10"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download (Single + ZIP)
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Current Variant</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleExport("pdf")}
                      disabled={!activeVariant || exporting !== null}
                    >
                      <Download className="mr-2 h-3.5 w-3.5" />
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport("excel")}
                      disabled={!activeVariant || exporting !== null}
                    >
                      <Table2 className="mr-2 h-3.5 w-3.5" />
                      Download Excel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>All Variants (ZIP)</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleExportAll("pdf")}
                      disabled={
                        variants.length === 0 ||
                        exporting !== null ||
                        !billingFeatures.bulkGeneration
                      }
                    >
                      <Download className="mr-2 h-3.5 w-3.5" />
                      Download All PDFs (ZIP) - Pro+
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExportAll("excel")}
                      disabled={
                        variants.length === 0 ||
                        exporting !== null ||
                        !billingFeatures.bulkGeneration
                      }
                    >
                      <Table2 className="mr-2 h-3.5 w-3.5" />
                      Download All Excel (ZIP) - Pro+
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleResetBreakSuggestions}>
                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                      Reset Breaks
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-3">
              <h3 className="mb-2 text-sm font-semibold text-brand-text">Rooms</h3>
              <p className="mb-2 text-xs text-brand-text-secondary">
                Hint: Add room name and capacity. Example: Room A-101, 60 seats.
              </p>
              <div className="thin-scrollbar max-h-56 space-y-2 overflow-y-auto pr-1">
                {constraints.rooms.map((room, idx) => (
                  <div key={`room-${idx}`} className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-start">
                    <div className="flex-1">
                      <Label className="mb-1 block text-xs">Room Name</Label>
                      <Input
                        placeholder="e.g. A-101"
                        value={room.name}
                        onChange={(event) => updateRoom(idx, { name: event.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex-none">
                      <div>
                        <Label className="mb-1 block text-xs">Capacity</Label>
                        <Input
                          type="number"
                          min={1}
                          value={room.capacity}
                          onChange={(event) => updateRoom(idx, { capacity: Number(event.target.value) || 0 })}
                        />
                      </div>
                      <div className="self-end">
                        <Button variant="ghost" size="icon" className="w-full text-destructive" onClick={() => removeRoom(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="mt-2 h-8"
                onClick={() =>
                  setConstraints((prev) => ({
                    ...prev,
                    rooms: [...prev.rooms, { name: "", capacity: 1 }],
                  }))
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Room
              </Button>
            </div>

            <div className="rounded-lg border bg-card p-3">
              <h3 className="mb-2 text-sm font-semibold text-brand-text">Schedule & Breaks</h3>
              <p className="mb-2 text-xs text-brand-text-secondary">
                Hint: Select teaching days first, then set slots per day and period timings.
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Teaching Days</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {dayOptions.map((day) => (
                      <label key={day} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                        <Checkbox
                          checked={constraints.days.includes(day)}
                          onCheckedChange={(checked) => {
                            setConstraints((prev) => {
                              const set = new Set(prev.days);
                              if (checked) set.add(day);
                              else set.delete(day);
                              return {
                                ...prev,
                                days: dayOptions.filter((option) => set.has(option)),
                              };
                            });
                          }}
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="max-w-[260px] space-y-2">
                  <Label>Slots per day</Label>
                  <Input
                    type="number"
                    min={0}
                    max={MAX_SLOTS_PER_DAY}
                    value={constraints.slotsPerDay}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      const nextSlotCount =
                        rawValue === "" ? 0 : clampSlotsPerDay(Number(rawValue));
                      setConstraints((prev) => ({
                        ...prev,
                        slotsPerDay: nextSlotCount,
                        slotTimings: normalizeSlotTimings(prev.slotTimings, nextSlotCount),
                      }));
                    }}
                  />
                  <p className="text-[11px] text-brand-text-secondary">
                    Choose from 0 to {MAX_SLOTS_PER_DAY} periods/day.
                    {constraints.slotsPerDay < 1
                      ? " Hint: 0 is valid for draft only; use at least 1 to generate."
                      : ""}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Period Timings</Label>
                    {hasAdvancedCustomTimings ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={resetSlotTimingsToDefault}
                      >
                        Reset to defaults
                      </Button>
                    ) : null}
                  </div>
                  <div className="thin-scrollbar max-h-44 space-y-2 overflow-y-auto pr-1">
                    {constraints.slotTimings.map((t, slotIndex) => {
                      return (
                        <div key={`period-${slotIndex + 1}`} className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-start">
                          <div className="flex items-center sm:w-16 sm:self-center">
                            <span className="text-sm font-medium text-brand-text">#{slotIndex + 1}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:flex-1">
                            <div>
                              <Label className="mb-1 block text-[10px] text-brand-text-secondary sm:hidden">
                                Start
                              </Label>
                              <div className="grid grid-cols-2 gap-2">
                                <Select
                                  disabled={false}
                                  value={splitTimeParts(t.start).hour}
                                  onValueChange={(val) => updateSlotTiming(slotIndex, { start: joinTimeParts(val, splitTimeParts(t.start).minute) })}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="HH" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-56">
                                    {hourOptions.map((h) => (
                                      <SelectItem key={h} value={h}>
                                        {h}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  disabled={false}
                                  value={splitTimeParts(t.start).minute}
                                  onValueChange={(val) => updateSlotTiming(slotIndex, { start: joinTimeParts(splitTimeParts(t.start).hour, val) })}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="MM" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {minuteOptions.map((m) => (
                                      <SelectItem key={m} value={m}>
                                        {m}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label className="mb-1 block text-[10px] text-brand-text-secondary sm:hidden">
                                End
                              </Label>
                              <div className="grid grid-cols-2 gap-2">
                                <Select
                                  disabled={false}
                                  value={splitTimeParts(t.end).hour}
                                  onValueChange={(val) => updateSlotTiming(slotIndex, { end: joinTimeParts(val, splitTimeParts(t.end).minute) })}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="HH" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-56">
                                    {hourOptions.map((h) => (
                                      <SelectItem key={h} value={h}>
                                        {h}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  disabled={false}
                                  value={splitTimeParts(t.end).minute}
                                  onValueChange={(val) => updateSlotTiming(slotIndex, { end: joinTimeParts(splitTimeParts(t.end).hour, val) })}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="MM" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {minuteOptions.map((m) => (
                                      <SelectItem key={m} value={m}>
                                        {m}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-brand-text-secondary">
                    These timings are used in generation, preview, PDF, and Excel exports.
                  </p>

                </div>

                <div className="space-y-2">
                  <Label>Breaks</Label>
                  <div className="thin-scrollbar max-h-44 space-y-2 overflow-y-auto pr-1">
                    {breaks.map((breakRule, idx) => (
                      <div key={breakRule.id} className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-start">
                        <div className="flex-1">
                          <Label className="mb-1 block text-[10px] text-brand-text-secondary">Name</Label>
                          <Input
                            placeholder="e.g. Lunch Break"
                            value={breakRule.name}
                            onChange={(e) => updateBreak(idx, { name: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:flex-none">
                          <div className="col-span-2">
                            <Label className="mb-1 block text-[10px] text-brand-text-secondary">After Period</Label>
                            <Select
                              value={String(breakRule.afterSlot)}
                              onValueChange={(val) => updateBreak(idx, { afterSlot: Number(val) })}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="#" />
                              </SelectTrigger>
                              <SelectContent>
                                {slotLabels.slice(0, -1).map((slotLabel, slotIndex) => (
                                  <SelectItem key={`${slotLabel}-${slotIndex}`} value={String(slotIndex + 1)}>
                                    {slotLabel}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="self-end">
                            <Button variant="ghost" size="icon" className="w-full text-destructive" onClick={() => removeBreak(breakRule.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="h-8" onClick={addBreak}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Break
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeVariant && (
        <div className="grid gap-6 md:grid-cols-2">
          <RoomUtilizationChart
            rooms={constraints.rooms}
            dayCount={constraints.days.length}
            slotsPerDay={constraints.slotsPerDay}
            variant={activeVariant}
          />
          <FacultyWorkloadChart faculties={constraints.faculties} variant={activeVariant} />
        </div>
      )}

      <HistoryDrawer
        open={historyDrawerOpen}
        onOpenChange={setHistoryDrawerOpen}
        onRestore={(savedConstraints, savedVariants) => {
          setConstraints(savedConstraints);
          setVariants(savedVariants);
          setActiveVariantId(savedVariants[0]?.id || null);
        }}
        planName={billingPlan}
      />

      <TemplatesDialog
        open={templatesDialogOpen}
        onOpenChange={setTemplatesDialogOpen}
        constraints={constraints}
        templateLimit={billingFeatures.maxTemplates}
        onLoad={(loadedConstraints) => {
          setConstraints(loadedConstraints);
          toast.success("Template loaded! You can now generate variants.");
        }}
      />

      <CalendarExportDialog
        open={calendarDialogOpen}
        onOpenChange={setCalendarDialogOpen}
        variant={activeVariant ?? null}
        constraints={constraints}
        slotLabels={slotLabels}
      />
    </div>
  );
}


