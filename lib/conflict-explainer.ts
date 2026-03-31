import type { SchedulerConstraints } from "@/lib/types";

export interface ConflictMessage {
  text: string;
  severity: "error" | "warning" | "info";
  action?: {
    label: string;
    section: "subjects" | "faculties" | "rooms" | "days" | "timings";
  };
}

export function explainDiagnostics(
  limitingFactors: string[],
  constraints: SchedulerConstraints,
  score?: number
): ConflictMessage[] {
  const messages: ConflictMessage[] = [];

  // Check for unmapped subjects (no faculty assigned)
  const unmappedSubjects = constraints.subjects.filter(
    (subject) =>
      !constraints.faculties.some((f) => f.canTeach.includes(subject.name))
  );
  if (unmappedSubjects.length > 0) {
    messages.push({
      text: `${unmappedSubjects.length} subject${unmappedSubjects.length > 1 ? "s have" : " has"} no faculty assigned: ${unmappedSubjects.map((s) => s.name).join(", ")}. Map each subject to at least one faculty member.`,
      severity: "error",
      action: { label: "Fix Faculty Mapping", section: "faculties" },
    });
  }

  // Check slot overflow (demand > capacity)
  const totalDemand = constraints.subjects.reduce(
    (sum, s) => sum + Math.max(0, s.weeklyHours || 0),
    0
  );
  const totalCapacity = constraints.days.length * constraints.slotsPerDay;
  if (totalDemand > totalCapacity) {
    messages.push({
      text: `Weekly demand is ${totalDemand} hours but timetable capacity is only ${totalCapacity} slots (${constraints.days.length} days × ${constraints.slotsPerDay} slots/day). Reduce subject hours or add more days/slots.`,
      severity: "error",
      action: { label: "Adjust Days & Slots", section: "days" },
    });
  }

  // Check for faculty overload (one person teaching too many subjects)
  constraints.faculties.forEach((faculty) => {
    const teachingHours = constraints.subjects
      .filter((s) => faculty.canTeach.includes(s.name))
      .reduce((sum, s) => sum + s.weeklyHours, 0);
    const availableDays = constraints.days.length - (faculty.unavailableDays?.length ?? 0);
    const maxFacultySlots = availableDays * constraints.slotsPerDay;
    if (teachingHours > maxFacultySlots && maxFacultySlots > 0) {
      messages.push({
        text: `${faculty.name} is assigned ${teachingHours} hours/week but only has ${maxFacultySlots} available slots (${availableDays} available days × ${constraints.slotsPerDay} slots). Reduce their assigned subjects or their unavailable days.`,
        severity: "warning",
        action: { label: "Edit Faculty", section: "faculties" },
      });
    }
  });

  // Check for subjects exceeding daily limits
  const overDailyLimit = constraints.subjects.filter((s) => {
    const maxPerDay = s.maxPerDay ?? 2;
    return s.weeklyHours > constraints.days.length * maxPerDay;
  });
  if (overDailyLimit.length > 0) {
    messages.push({
      text: `${overDailyLimit.map((s) => s.name).join(", ")} exceed${overDailyLimit.length === 1 ? "s" : ""} the daily distribution limit. Increase max/day or reduce weekly hours.`,
      severity: "warning",
      action: { label: "Edit Subjects", section: "subjects" },
    });
  }

  // Check for too few rooms
  if (constraints.rooms.length === 0) {
    messages.push({
      text: "No rooms defined. Add at least one room for scheduling.",
      severity: "error",
      action: { label: "Add Rooms", section: "rooms" },
    });
  }

  // Parse limiting factors from the API response
  const factorSet = new Set(limitingFactors.map((f) => f.toLowerCase()));

  if (factorSet.has("no available faculty for subject") || factorSet.has("unmapped faculty")) {
    if (!messages.some((m) => m.action?.section === "faculties" && m.severity === "error")) {
      messages.push({
        text: "Some subjects could not be scheduled because no available faculty was found. Check faculty-to-subject mappings and unavailable days.",
        severity: "error",
        action: { label: "Fix Faculty Mapping", section: "faculties" },
      });
    }
  }

  if (factorSet.has("no available room") || factorSet.has("room conflict")) {
    messages.push({
      text: "Room conflicts detected. Some time slots had no available room. Consider adding more rooms or redistributing classes.",
      severity: "warning",
      action: { label: "Add Rooms", section: "rooms" },
    });
  }

  // Score-based suggestions
  if (typeof score === "number" && score < 70 && messages.length === 0) {
    messages.push({
      text: `Timetable quality score is ${score}%. This usually means there are tight constraint interactions. Try loosening constraints — add an extra day, increase max slots per day, or reduce weekly hours for some subjects.`,
      severity: "info",
    });
  }

  return messages;
}


