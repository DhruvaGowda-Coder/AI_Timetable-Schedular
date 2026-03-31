import { formatISO } from "date-fns";
import type {
  SchedulerConstraints,
  TimetableSlot,
  TimetableVariant,
} from "@/lib/types";
import {
  MAX_SLOTS_PER_DAY,
  createSlotLabels,
  normalizeSlotTimings,
} from "@/lib/scheduler-utils";

interface SubjectDemand {
  subject: string;
  remaining: number;
  maxPerDay: number;
}

interface VariantGenerationDiagnostics {
  requestedCount: number;
  generatedCount: number;
  attemptsUsed: number;
  limitingFactors: string[];
}

interface VariantGenerationResult {
  variants: TimetableVariant[];
  diagnostics: VariantGenerationDiagnostics;
}

const MIN_VARIANT_ATTEMPTS = 120;
const MAX_VARIANT_ATTEMPTS = 12000;
const ATTEMPTS_PER_REQUESTED_VARIANT = 40;

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function shuffle<T>(arr: T[], randomFn: () => number): T[] {
  const clone = [...arr];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFn() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function selectFaculty(
  subject: string,
  day: string,
  daySlotKey: string,
  constraints: SchedulerConstraints,
  facultyUsage: Map<string, Set<string>>,
  randomFn: () => number
) {
  const eligible = constraints.faculties.filter((faculty) =>
    faculty.canTeach.includes(subject) &&
    !(faculty.unavailableDays ?? []).includes(day)
  );
  const shuffled = shuffle(eligible, randomFn);
  return shuffled.find((faculty) => {
    const used = facultyUsage.get(faculty.name) ?? new Set<string>();
    return !used.has(daySlotKey);
  });
}

function selectRoom(
  daySlotKey: string,
  constraints: SchedulerConstraints,
  roomUsage: Map<string, Set<string>>,
  randomFn: () => number
) {
  const shuffled = shuffle(constraints.rooms, randomFn);
  return shuffled.find((room) => {
    const used = roomUsage.get(room.name) ?? new Set<string>();
    return !used.has(daySlotKey);
  });
}

function clampHours(hours: number) {
  if (!Number.isFinite(hours)) return 1;
  return Math.max(1, Math.min(8, Math.floor(hours)));
}

function clampMaxPerDay(value: number | undefined) {
  if (!Number.isFinite(value ?? NaN)) return 2;
  return Math.max(1, Math.min(6, Math.floor(value as number)));
}

function normalizeConstraints(constraints: SchedulerConstraints): SchedulerConstraints {
  const slotsPerDay = Math.max(1, Math.min(MAX_SLOTS_PER_DAY, constraints.slotsPerDay));

  const subjects = constraints.subjects
    .map((subject) => ({
      name: subject.name.trim(),
      weeklyHours: clampHours(subject.weeklyHours),
      maxPerDay: clampMaxPerDay(subject.maxPerDay),
    }))
    .filter((subject) => subject.name.length > 0);

  const faculties = constraints.faculties
    .map((faculty) => ({
      name: faculty.name.trim(),
      canTeach: faculty.canTeach.filter(Boolean),
      unavailableDays: Array.isArray(faculty.unavailableDays)
        ? faculty.unavailableDays.filter(Boolean)
        : [],
    }))
    .filter((faculty) => faculty.name.length > 0);

  const rooms = constraints.rooms
    .map((room) => ({
      name: room.name.trim(),
      capacity: room.capacity,
    }))
    .filter((room) => room.name.length > 0);

  return {
    days: constraints.days.filter(Boolean),
    slotsPerDay,
    slotTimings: normalizeSlotTimings(constraints.slotTimings, slotsPerDay),
    subjects,
    faculties,
    rooms,
  };
}

function buildVariantSignature(variant: TimetableVariant) {
  return variant.slots
    .map(
      (slot) =>
        `${slot.day}|${slot.slotLabel}|${slot.subject}|${slot.faculty}|${slot.room}`
    )
    .join(";");
}

function collectLimitingFactors(constraints: SchedulerConstraints): string[] {
  const factors: string[] = [];
  const daysCount = constraints.days.length;
  const totalSlots = daysCount * constraints.slotsPerDay;
  const totalDemand = constraints.subjects.reduce(
    (sum, subject) => sum + Math.max(0, subject.weeklyHours),
    0
  );

  if (totalDemand > totalSlots) {
    factors.push(
      `Weekly subject hours (${totalDemand}) exceed available slots (${totalSlots}).`
    );
  }

  const subjectsOverDailyLimit = constraints.subjects
    .filter((subject) => {
      const perDayLimit = clampMaxPerDay(subject.maxPerDay);
      const weeklyDistributionLimit = Math.max(1, daysCount * perDayLimit);
      return subject.weeklyHours > weeklyDistributionLimit;
    })
    .map((subject) => {
      const perDayLimit = clampMaxPerDay(subject.maxPerDay);
      const weeklyDistributionLimit = Math.max(1, daysCount * perDayLimit);
      return `${subject.name} (${subject.weeklyHours} > ${weeklyDistributionLimit})`;
    });
  if (subjectsOverDailyLimit.length > 0) {
    factors.push(
      `Some subjects exceed per-week distribution limit: ${subjectsOverDailyLimit.join(", ")}.`
    );
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
    factors.push(
      `No eligible faculty mapped for subject(s): ${unmappedSubjects.join(", ")}.`
    );
  }

  if (constraints.rooms.length === 0) {
    factors.push("At least one room is required.");
  }

  if (constraints.days.length === 0 || constraints.slotTimings.length === 0) {
    factors.push("At least one teaching day and one slot are required.");
  }

  return factors;
}

export function generateTimetableVariant(
  rawConstraints: SchedulerConstraints,
  seed = Date.now()
): TimetableVariant {
  const constraints = normalizeConstraints(rawConstraints);
  const randomFn = seededRandom(seed);
  const slotLabels = createSlotLabels(constraints.slotTimings);
  const subjectDemand: SubjectDemand[] = constraints.subjects.map((subject) => ({
    subject: subject.name,
    remaining: subject.weeklyHours,
    maxPerDay: clampMaxPerDay(subject.maxPerDay),
  }));

  const slots: TimetableSlot[] = [];
  const facultyUsage = new Map<string, Set<string>>();
  const roomUsage = new Map<string, Set<string>>();
  const subjectDailyCounts = new Map<string, number>();
  let unresolved = 0;

  const daySlots = shuffle(
    constraints.days.flatMap((day) => slotLabels.map((slotLabel) => ({ day, slotLabel }))),
    randomFn
  );

  for (const demand of subjectDemand) {
    while (demand.remaining > 0) {
      const candidate = daySlots.find(({ day, slotLabel }) => {
        const alreadyUsed = slots.some(
          (slot) => slot.day === day && slot.slotLabel === slotLabel
        );
        const subjectDayKey = `${demand.subject}-${day}`;
        const dailyCount = subjectDailyCounts.get(subjectDayKey) ?? 0;
        return !alreadyUsed && dailyCount < demand.maxPerDay;
      });

      if (!candidate) {
        unresolved += 1;
        break;
      }

      const daySlotKey = `${candidate.day}-${candidate.slotLabel}`;
      const faculty = selectFaculty(
        demand.subject,
        candidate.day,
        daySlotKey,
        constraints,
        facultyUsage,
        randomFn
      );
      const room = selectRoom(daySlotKey, constraints, roomUsage, randomFn);

      if (!faculty || !room) {
        unresolved += 1;
        daySlots.splice(daySlots.indexOf(candidate), 1);
        continue;
      }

      slots.push({
        day: candidate.day,
        slotLabel: candidate.slotLabel,
        subject: demand.subject,
        faculty: faculty.name,
        room: room.name,
      });

      const subjectDayKey = `${demand.subject}-${candidate.day}`;
      subjectDailyCounts.set(subjectDayKey, (subjectDailyCounts.get(subjectDayKey) ?? 0) + 1);

      if (!facultyUsage.has(faculty.name)) facultyUsage.set(faculty.name, new Set<string>());
      if (!roomUsage.has(room.name)) roomUsage.set(room.name, new Set<string>());

      facultyUsage.get(faculty.name)?.add(daySlotKey);
      roomUsage.get(room.name)?.add(daySlotKey);

      daySlots.splice(daySlots.indexOf(candidate), 1);
      demand.remaining -= 1;
    }
  }

  const score = Math.max(45, 100 - unresolved * 10);
  return {
    id: `variant-${seed}`,
    name: "Variant",
    score,
    createdAt: formatISO(new Date()),
    slots: slots.sort((a, b) => a.day.localeCompare(b.day) || a.slotLabel.localeCompare(b.slotLabel)),
  };
}

export function generateTimetableVariantsWithDiagnostics(
  rawConstraints: SchedulerConstraints,
  requestedCount = 3
): VariantGenerationResult {
  const constraints = normalizeConstraints(rawConstraints);
  const normalizedRequestedCount = Number.isFinite(requestedCount)
    ? Math.max(1, Math.trunc(requestedCount))
    : 1;
  const attemptsBudget = Math.min(
    MAX_VARIANT_ATTEMPTS,
    Math.max(
      MIN_VARIANT_ATTEMPTS,
      normalizedRequestedCount * ATTEMPTS_PER_REQUESTED_VARIANT
    )
  );
  const variants: TimetableVariant[] = [];
  const seenSignatures = new Set<string>();
  const limitingFactors = collectLimitingFactors(constraints);
  const baseSeed = Date.now();
  let attemptsUsed = 0;

  while (
    variants.length < normalizedRequestedCount &&
    attemptsUsed < attemptsBudget
  ) {
    const attemptSeed = baseSeed + attemptsUsed * 7919;
    const variant = generateTimetableVariant(constraints, attemptSeed);
    const signature = buildVariantSignature(variant);
    attemptsUsed += 1;

    if (seenSignatures.has(signature)) {
      continue;
    }

    seenSignatures.add(signature);
    variants.push({
      ...variant,
      name: `Variant ${variants.length + 1}`,
    });
  }

  if (
    variants.length < normalizedRequestedCount &&
    limitingFactors.length === 0
  ) {
    limitingFactors.push(
      "Current inserted subjects, faculties, and rooms produce a limited set of unique variants."
    );
  }

  return {
    variants,
    diagnostics: {
      requestedCount: normalizedRequestedCount,
      generatedCount: variants.length,
      attemptsUsed,
      limitingFactors,
    },
  };
}

export function generateTimetableVariants(
  constraints: SchedulerConstraints,
  count = 3
): TimetableVariant[] {
  return generateTimetableVariantsWithDiagnostics(constraints, count).variants;
}


