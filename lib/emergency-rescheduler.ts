import { formatISO } from "date-fns";
import { createSlotLabels, normalizeSlotTimings } from "@/lib/scheduler-utils";
import type {
  EmergencyDisruptionEvent,
  EmergencyImpactAnalysis,
  EmergencyProposal,
  SchedulerConstraints,
  TimetableSlot,
  TimetableVariant,
} from "@/lib/types";

interface StrategyWeights {
  dayChange: number;
  slotChange: number;
  slotDistance: number;
  facultyChange: number;
  roomChange: number;
  facultyLoad: number;
}

interface RescheduleStrategy {
  id: string;
  label: string;
  summary: string;
  weights: StrategyWeights;
}

interface TimeslotPoint {
  day: string;
  slotLabel: string;
}

interface AssignmentCandidate {
  slot: TimetableSlot;
  cost: number;
}

interface OccupancyMaps {
  occupiedByTimeslot: Map<string, TimetableSlot>;
  facultyByTimeslot: Map<string, Set<string>>;
  roomByTimeslot: Map<string, Set<string>>;
}

const DEFAULT_MAX_PROPOSALS = 3;
const UNRESOLVED_PENALTY = 60;

const STRATEGIES: RescheduleStrategy[] = [
  {
    id: "minimal_disruption",
    label: "Option A - Minimal Disruption",
    summary: "Prioritizes same day/time and minimal total changes.",
    weights: {
      dayChange: 12,
      slotChange: 8,
      slotDistance: 1,
      facultyChange: 5,
      roomChange: 4,
      facultyLoad: 0,
    },
  },
  {
    id: "same_day_priority",
    label: "Option B - Same Day Priority",
    summary: "Keeps classes on the same day where possible.",
    weights: {
      dayChange: 16,
      slotChange: 5,
      slotDistance: 0.5,
      facultyChange: 5,
      roomChange: 3.5,
      facultyLoad: 0,
    },
  },
  {
    id: "balanced_workload",
    label: "Option C - Balanced Workload",
    summary: "Balances faculty load while still limiting schedule movement.",
    weights: {
      dayChange: 11,
      slotChange: 8,
      slotDistance: 1,
      facultyChange: 4,
      roomChange: 4,
      facultyLoad: 1.25,
    },
  },
];

function toSlotKey(day: string, slotLabel: string) {
  return `${day}|||${slotLabel}`;
}

function hashString(input: string) {
  let hash = 0;
  for (let idx = 0; idx < input.length; idx += 1) {
    hash = (hash * 31 + input.charCodeAt(idx)) | 0;
  }
  return Math.abs(hash);
}

function matchesWindow(event: EmergencyDisruptionEvent, day: string, slotLabel: string) {
  const dayMatches = event.day ? event.day === day : true;
  const slotMatches = event.slotLabel ? event.slotLabel === slotLabel : true;
  return dayMatches && slotMatches;
}

function isSlotBlockedByEvent(event: EmergencyDisruptionEvent, day: string, slotLabel: string) {
  return event.type === "slot_blocked" && matchesWindow(event, day, slotLabel);
}

function isFacultyBlockedByEvent(
  event: EmergencyDisruptionEvent,
  faculty: string,
  day: string,
  slotLabel: string
) {
  return (
    event.type === "faculty_unavailable" &&
    !!event.entityName &&
    event.entityName === faculty &&
    matchesWindow(event, day, slotLabel)
  );
}

function isRoomBlockedByEvent(
  event: EmergencyDisruptionEvent,
  room: string,
  day: string,
  slotLabel: string
) {
  return (
    event.type === "room_unavailable" &&
    !!event.entityName &&
    event.entityName === room &&
    matchesWindow(event, day, slotLabel)
  );
}

function isSlotImpacted(slot: TimetableSlot, event: EmergencyDisruptionEvent) {
  if (!matchesWindow(event, slot.day, slot.slotLabel)) return false;

  if (event.type === "faculty_unavailable") {
    return !!event.entityName && slot.faculty === event.entityName;
  }
  if (event.type === "room_unavailable") {
    return !!event.entityName && slot.room === event.entityName;
  }
  return event.type === "slot_blocked";
}

function buildTimeslotGrid(
  constraints: SchedulerConstraints,
  baseVariant: TimetableVariant
): TimeslotPoint[] {
  const dayOptions =
    constraints.days.length > 0
      ? constraints.days
      : Array.from(new Set(baseVariant.slots.map((slot) => slot.day)));
  const normalizedSlotTimings = normalizeSlotTimings(
    constraints.slotTimings,
    constraints.slotsPerDay
  );
  const slotLabels =
    normalizedSlotTimings.length > 0
      ? createSlotLabels(normalizedSlotTimings)
      : Array.from(
          new Set(baseVariant.slots.map((slot) => slot.slotLabel))
        ).sort((a, b) => a.localeCompare(b));

  return dayOptions.flatMap((day) =>
    slotLabels.map((slotLabel) => ({
      day,
      slotLabel,
    }))
  );
}

function buildOccupancyMaps(slots: TimetableSlot[]): OccupancyMaps {
  const occupiedByTimeslot = new Map<string, TimetableSlot>();
  const facultyByTimeslot = new Map<string, Set<string>>();
  const roomByTimeslot = new Map<string, Set<string>>();

  slots.forEach((slot) => {
    const key = toSlotKey(slot.day, slot.slotLabel);
    occupiedByTimeslot.set(key, slot);

    const facultySet = facultyByTimeslot.get(key) ?? new Set<string>();
    facultySet.add(slot.faculty);
    facultyByTimeslot.set(key, facultySet);

    const roomSet = roomByTimeslot.get(key) ?? new Set<string>();
    roomSet.add(slot.room);
    roomByTimeslot.set(key, roomSet);
  });

  return { occupiedByTimeslot, facultyByTimeslot, roomByTimeslot };
}

function addSlotToOccupancy(occupancy: OccupancyMaps, slot: TimetableSlot) {
  const key = toSlotKey(slot.day, slot.slotLabel);
  occupancy.occupiedByTimeslot.set(key, slot);
  const facultySet = occupancy.facultyByTimeslot.get(key) ?? new Set<string>();
  facultySet.add(slot.faculty);
  occupancy.facultyByTimeslot.set(key, facultySet);
  const roomSet = occupancy.roomByTimeslot.get(key) ?? new Set<string>();
  roomSet.add(slot.room);
  occupancy.roomByTimeslot.set(key, roomSet);
}

function buildFacultyLoadMap(slots: TimetableSlot[]) {
  const facultyLoad = new Map<string, number>();
  slots.forEach((slot) => {
    facultyLoad.set(slot.faculty, (facultyLoad.get(slot.faculty) ?? 0) + 1);
  });
  return facultyLoad;
}

function sortSlotsByGridOrder(slots: TimetableSlot[], constraints: SchedulerConstraints) {
  const dayOrder = new Map<string, number>();
  constraints.days.forEach((day, idx) => {
    dayOrder.set(day, idx);
  });
  const slotLabels = createSlotLabels(
    normalizeSlotTimings(constraints.slotTimings, constraints.slotsPerDay)
  );
  const slotOrder = new Map<string, number>();
  slotLabels.forEach((slotLabel, idx) => {
    slotOrder.set(slotLabel, idx);
  });

  return [...slots].sort((a, b) => {
    const dayIndexA = dayOrder.get(a.day) ?? Number.MAX_SAFE_INTEGER;
    const dayIndexB = dayOrder.get(b.day) ?? Number.MAX_SAFE_INTEGER;
    if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;

    const slotIndexA = slotOrder.get(a.slotLabel) ?? Number.MAX_SAFE_INTEGER;
    const slotIndexB = slotOrder.get(b.slotLabel) ?? Number.MAX_SAFE_INTEGER;
    if (slotIndexA !== slotIndexB) return slotIndexA - slotIndexB;

    return a.subject.localeCompare(b.subject);
  });
}

function findBestCandidateForSlot(
  impactedSlot: TimetableSlot,
  constraints: SchedulerConstraints,
  event: EmergencyDisruptionEvent,
  timeslotGrid: TimeslotPoint[],
  occupancy: OccupancyMaps,
  facultyLoad: Map<string, number>,
  strategy: RescheduleStrategy
): AssignmentCandidate | null {
  const normalizedSlotLabels = createSlotLabels(
    normalizeSlotTimings(constraints.slotTimings, constraints.slotsPerDay)
  );
  const slotIndexMap = new Map<string, number>();
  normalizedSlotLabels.forEach((slotLabel, idx) => {
    slotIndexMap.set(slotLabel, idx);
  });

  const mappedFaculties = constraints.faculties
    .filter((faculty) => faculty.canTeach.includes(impactedSlot.subject))
    .map((faculty) => faculty.name);
  const facultyPool =
    mappedFaculties.length > 0
      ? mappedFaculties
      : Array.from(new Set([impactedSlot.faculty]));

  const mappedRooms = constraints.rooms.map((room) => room.name);
  const roomPool =
    mappedRooms.length > 0
      ? mappedRooms
      : Array.from(new Set([impactedSlot.room]));

  const originalSlotIndex = slotIndexMap.get(impactedSlot.slotLabel) ?? 0;
  let bestCandidate: AssignmentCandidate | null = null;

  for (const point of timeslotGrid) {
    if (isSlotBlockedByEvent(event, point.day, point.slotLabel)) continue;
    const key = toSlotKey(point.day, point.slotLabel);
    if (occupancy.occupiedByTimeslot.has(key)) continue;

    for (const faculty of facultyPool) {
      const facultyConstraint = constraints.faculties.find(
        (candidate) => candidate.name === faculty
      );
      if ((facultyConstraint?.unavailableDays ?? []).includes(point.day)) continue;
      if (isFacultyBlockedByEvent(event, faculty, point.day, point.slotLabel)) continue;
      const occupiedFaculty = occupancy.facultyByTimeslot.get(key);
      if (occupiedFaculty?.has(faculty)) continue;

      for (const room of roomPool) {
        if (isRoomBlockedByEvent(event, room, point.day, point.slotLabel)) continue;
        const occupiedRoom = occupancy.roomByTimeslot.get(key);
        if (occupiedRoom?.has(room)) continue;

        const targetSlotIndex = slotIndexMap.get(point.slotLabel) ?? originalSlotIndex;
        const dayChanged = impactedSlot.day !== point.day ? 1 : 0;
        const slotChanged = impactedSlot.slotLabel !== point.slotLabel ? 1 : 0;
        const facultyChanged = impactedSlot.faculty !== faculty ? 1 : 0;
        const roomChanged = impactedSlot.room !== room ? 1 : 0;
        const slotDistance = Math.abs(targetSlotIndex - originalSlotIndex);
        const facultyLoadPenalty = facultyLoad.get(faculty) ?? 0;

        const cost =
          dayChanged * strategy.weights.dayChange +
          slotChanged * strategy.weights.slotChange +
          slotDistance * strategy.weights.slotDistance +
          facultyChanged * strategy.weights.facultyChange +
          roomChanged * strategy.weights.roomChange +
          facultyLoadPenalty * strategy.weights.facultyLoad;

        if (!bestCandidate || cost < bestCandidate.cost) {
          bestCandidate = {
            slot: {
              day: point.day,
              slotLabel: point.slotLabel,
              subject: impactedSlot.subject,
              faculty,
              room,
            },
            cost,
          };
        }
      }
    }
  }

  return bestCandidate;
}

function buildProposalFromStrategy(
  strategy: RescheduleStrategy,
  constraints: SchedulerConstraints,
  baseVariant: TimetableVariant,
  impactedSlots: TimetableSlot[],
  event: EmergencyDisruptionEvent
): EmergencyProposal {
  const impactedKeys = new Set<string>(
    impactedSlots.map((slot) => toSlotKey(slot.day, slot.slotLabel))
  );
  const retainedSlots = baseVariant.slots.filter(
    (slot) => !impactedKeys.has(toSlotKey(slot.day, slot.slotLabel))
  );
  const occupancy = buildOccupancyMaps(retainedSlots);
  const facultyLoad = buildFacultyLoadMap(retainedSlots);
  const timeslotGrid = buildTimeslotGrid(constraints, baseVariant);

  let disruptionScore = 0;
  const unresolvedSlots: TimetableSlot[] = [];
  const changes: EmergencyProposal["changes"] = [];
  const scheduledSlots: TimetableSlot[] = [...retainedSlots];

  for (const impactedSlot of impactedSlots) {
    const candidate = findBestCandidateForSlot(
      impactedSlot,
      constraints,
      event,
      timeslotGrid,
      occupancy,
      facultyLoad,
      strategy
    );

    if (!candidate) {
      unresolvedSlots.push(impactedSlot);
      disruptionScore += UNRESOLVED_PENALTY;
      continue;
    }

    scheduledSlots.push(candidate.slot);
    addSlotToOccupancy(occupancy, candidate.slot);
    facultyLoad.set(
      candidate.slot.faculty,
      (facultyLoad.get(candidate.slot.faculty) ?? 0) + 1
    );
    disruptionScore += candidate.cost;

    if (
      impactedSlot.day !== candidate.slot.day ||
      impactedSlot.slotLabel !== candidate.slot.slotLabel ||
      impactedSlot.faculty !== candidate.slot.faculty ||
      impactedSlot.room !== candidate.slot.room
    ) {
      changes.push({
        subject: impactedSlot.subject,
        from: {
          day: impactedSlot.day,
          slotLabel: impactedSlot.slotLabel,
          faculty: impactedSlot.faculty,
          room: impactedSlot.room,
        },
        to: {
          day: candidate.slot.day,
          slotLabel: candidate.slot.slotLabel,
          faculty: candidate.slot.faculty,
          room: candidate.slot.room,
        },
      });
    }
  }

  unresolvedSlots.forEach((slot) => scheduledSlots.push(slot));

  const normalizedDisruptionScore = Number(
    Math.max(0, disruptionScore).toFixed(2)
  );
  const averagePenalty =
    impactedSlots.length > 0 ? normalizedDisruptionScore / impactedSlots.length : 0;
  const projectedScore = Math.max(
    0,
    Math.min(
      100,
      Math.round((Number.isFinite(baseVariant.score) ? baseVariant.score : 85) - averagePenalty)
    )
  );

  const sortedSlots = sortSlotsByGridOrder(scheduledSlots, constraints);
  const signature = sortedSlots
    .map(
      (slot) =>
        `${slot.day}|${slot.slotLabel}|${slot.subject}|${slot.faculty}|${slot.room}`
    )
    .join(";");
  const summary =
    unresolvedSlots.length === 0
      ? `Resolved ${impactedSlots.length} impacted class${
          impactedSlots.length === 1 ? "" : "es"
        } with ${changes.length} change${changes.length === 1 ? "" : "s"}.`
      : `Resolved ${impactedSlots.length - unresolvedSlots.length}/${
          impactedSlots.length
        } impacted classes. ${unresolvedSlots.length} could not be reassigned.`;

  return {
    id: `${strategy.id}-${hashString(signature).toString(36)}`,
    label: strategy.label,
    summary,
    disruptionScore: normalizedDisruptionScore,
    unresolvedCount: unresolvedSlots.length,
    updatedVariant: {
      id: `${strategy.id}-${Date.now()}`,
      name: strategy.label,
      score: projectedScore,
      createdAt: formatISO(new Date()),
      slots: sortedSlots,
    },
    changes,
  };
}

export function generateEmergencyImpactAnalysis(
  constraints: SchedulerConstraints,
  baseVariant: TimetableVariant,
  event: EmergencyDisruptionEvent,
  maxProposals = DEFAULT_MAX_PROPOSALS
): EmergencyImpactAnalysis {
  const impactedSlots = baseVariant.slots.filter((slot) =>
    isSlotImpacted(slot, event)
  );

  if (impactedSlots.length === 0) {
    return {
      event,
      impactedSlots: [],
      proposals: [],
      message: "No scheduled classes are impacted by this emergency event.",
    };
  }

  const proposals: EmergencyProposal[] = [];
  const seenSignatures = new Set<string>();

  for (const strategy of STRATEGIES) {
    const proposal = buildProposalFromStrategy(
      strategy,
      constraints,
      baseVariant,
      impactedSlots,
      event
    );
    const signature = proposal.updatedVariant.slots
      .map(
        (slot) =>
          `${slot.day}|${slot.slotLabel}|${slot.subject}|${slot.faculty}|${slot.room}`
      )
      .join(";");
    if (seenSignatures.has(signature)) continue;
    seenSignatures.add(signature);
    proposals.push(proposal);
    if (proposals.length >= maxProposals) break;
  }

  if (proposals.length === 0) {
    return {
      event,
      impactedSlots,
      proposals: [],
      message:
        "Emergency detected, but no feasible rescheduling proposal could satisfy the current constraints.",
    };
  }

  const best = proposals.reduce((currentBest, candidate) =>
    candidate.disruptionScore < currentBest.disruptionScore ? candidate : currentBest
  );

  return {
    event,
    impactedSlots,
    proposals,
    message: `Emergency detected: ${impactedSlots.length} impacted class${
      impactedSlots.length === 1 ? "" : "es"
    }. Best proposal "${best.label}" has disruption score ${best.disruptionScore}.`,
  };
}

export function createAppliedEmergencyVariant(
  proposal: EmergencyProposal
): TimetableVariant {
  const appliedAt = new Date();
  return {
    ...proposal.updatedVariant,
    id: `emergency-${appliedAt.getTime()}`,
    name: `Emergency Variant ${appliedAt.toISOString().slice(11, 19)}`,
    createdAt: formatISO(appliedAt),
  };
}


