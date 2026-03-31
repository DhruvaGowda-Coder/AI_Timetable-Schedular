import type { SlotTiming } from "@/lib/types";

export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const MAX_SLOTS_PER_DAY = 12;

export function isValidTimeString(value: string) {
  return TIME_PATTERN.test(value);
}

export function timeStringToMinutes(value: string) {
  if (!isValidTimeString(value)) return NaN;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}

export function createDefaultSlotTimings(slotCount: number, startHour = 9): SlotTiming[] {
  return Array.from({ length: slotCount }, (_, idx) => {
    const start = startHour + idx;
    const end = start + 1;
    return {
      start: `${padTimePart(start)}:00`,
      end: `${padTimePart(end)}:00`,
    };
  });
}

export function normalizeSlotTimings(slotTimings: SlotTiming[] | undefined, slotCount: number) {
  const normalizedSlotCount = Number.isFinite(slotCount) ? Math.trunc(slotCount) : 0;
  const count = Math.max(0, Math.min(MAX_SLOTS_PER_DAY, normalizedSlotCount));
  if (count === 0) return [];
  const fallback = createDefaultSlotTimings(count);
  return Array.from({ length: count }, (_, idx) => {
    const value = slotTimings?.[idx];
    if (!value) return fallback[idx];
    return {
      start: isValidTimeString(value.start) ? value.start : fallback[idx].start,
      end: isValidTimeString(value.end) ? value.end : fallback[idx].end,
    };
  });
}

export function toSlotLabel(slotTiming: SlotTiming) {
  return `${slotTiming.start}-${slotTiming.end}`;
}

export function createSlotLabels(slotTimings: SlotTiming[]) {
  return slotTimings.map((slotTiming) => toSlotLabel(slotTiming));
}


