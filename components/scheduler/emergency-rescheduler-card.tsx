"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldAlert, Zap } from "lucide-react";
import { toast } from "sonner";
import { createSlotLabels } from "@/lib/scheduler-utils";
import type {
  EmergencyDisruptionEvent,
  EmergencyEventType,
  EmergencyImpactAnalysis,
  SchedulerConstraints,
  TimetableVariant,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EmergencyApiResponse {
  message?: string;
  analysis?: EmergencyImpactAnalysis;
  appliedVariant?: TimetableVariant;
}

interface EmergencyReschedulerCardProps {
  constraints: SchedulerConstraints;
  activeVariant: TimetableVariant | null;
  onVariantApplied: (variant: TimetableVariant) => void;
}

function fromSelectableValue(value: string) {
  return value === "__any__" ? undefined : value;
}

export function EmergencyReschedulerCard({
  constraints,
  activeVariant,
  onVariantApplied,
}: EmergencyReschedulerCardProps) {
  const [eventType, setEventType] = useState<EmergencyEventType>("faculty_unavailable");
  const [entityName, setEntityName] = useState("");
  const [dayFilter, setDayFilter] = useState("__any__");
  const [slotFilter, setSlotFilter] = useState("__any__");
  const [reason, setReason] = useState("");
  const [analysis, setAnalysis] = useState<EmergencyImpactAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [applyingProposalId, setApplyingProposalId] = useState<string | null>(null);

  const slotLabels = useMemo(
    () => createSlotLabels(constraints.slotTimings),
    [constraints.slotTimings]
  );
  const facultyNames = useMemo(
    () =>
      constraints.faculties
        .map((faculty) => faculty.name.trim())
        .filter((name) => name.length > 0),
    [constraints.faculties]
  );
  const roomNames = useMemo(
    () =>
      constraints.rooms
        .map((room) => room.name.trim())
        .filter((name) => name.length > 0),
    [constraints.rooms]
  );
  const selectableEntities = eventType === "faculty_unavailable" ? facultyNames : roomNames;

  useEffect(() => {
    if (eventType === "slot_blocked") {
      setEntityName("");
      return;
    }
    if (selectableEntities.length === 0) {
      setEntityName("");
      return;
    }
    setEntityName((previous) =>
      selectableEntities.includes(previous) ? previous : selectableEntities[0]
    );
  }, [eventType, selectableEntities]);

  useEffect(() => {
    setAnalysis(null);
  }, [eventType, entityName, dayFilter, slotFilter, reason, activeVariant?.id]);

  const eventPayload: EmergencyDisruptionEvent = useMemo(
    () => ({
      type: eventType,
      entityName:
        eventType === "slot_blocked" || entityName.trim().length === 0
          ? undefined
          : entityName.trim(),
      day: fromSelectableValue(dayFilter),
      slotLabel: fromSelectableValue(slotFilter),
      reason: reason.trim().length > 0 ? reason.trim() : undefined,
    }),
    [eventType, entityName, dayFilter, slotFilter, reason]
  );

  async function analyzeEmergencyImpact() {
    if (!activeVariant) {
      toast.error("Generate at least one variant before emergency rescheduling.");
      return;
    }
    if (
      (eventType === "faculty_unavailable" || eventType === "room_unavailable") &&
      entityName.trim().length === 0
    ) {
      toast.error("Select the unavailable faculty/room.");
      return;
    }
    if (
      eventType === "slot_blocked" &&
      dayFilter === "__any__" &&
      slotFilter === "__any__"
    ) {
      toast.error("Select at least a day or a slot for a blocked-slot event.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/scheduler/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "propose",
          constraints,
          variant: activeVariant,
          event: eventPayload,
        }),
      });
      const payload = (await response.json()) as EmergencyApiResponse;
      if (!response.ok || !payload.analysis) {
        toast.error(payload.message ?? "Unable to analyze emergency impact.");
        return;
      }
      setAnalysis(payload.analysis);
      toast.success(payload.message ?? "Emergency impact analysis completed.");
    } catch {
      toast.error("Emergency analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function applyProposal(proposalId: string) {
    if (!activeVariant || !analysis) return;
    setApplyingProposalId(proposalId);
    try {
      const response = await fetch("/api/scheduler/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "apply",
          proposalId,
          constraints,
          variant: activeVariant,
          event: analysis.event,
        }),
      });
      const payload = (await response.json()) as EmergencyApiResponse;
      if (!response.ok || !payload.appliedVariant) {
        toast.error(payload.message ?? "Failed to apply emergency proposal.");
        return;
      }
      onVariantApplied(payload.appliedVariant);
      setAnalysis(payload.analysis ?? analysis);
      toast.success("Emergency schedule applied and activated.");
    } catch {
      toast.error("Could not apply emergency proposal.");
    } finally {
      setApplyingProposalId(null);
    }
  }

  return (
    <Card className="surface-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="h-4 w-4 text-secondary" />
          Dynamic Emergency Rescheduling
        </CardTitle>
        <p className="text-sm text-brand-text-secondary">
          Trigger a disruption, analyze affected classes, then apply the best low-disruption option.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Event Type</Label>
            <Select
              value={eventType}
              onValueChange={(value) => setEventType(value as EmergencyEventType)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="faculty_unavailable">Faculty Unavailable</SelectItem>
                <SelectItem value="room_unavailable">Room Unavailable</SelectItem>
                <SelectItem value="slot_blocked">Slot Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{eventType === "faculty_unavailable" ? "Faculty" : "Room"}</Label>
            {eventType === "slot_blocked" ? (
              <Input value="Not required for slot block" disabled className="h-9" />
            ) : (
              <Select value={entityName} onValueChange={setEntityName}>
                <SelectTrigger className="h-9">
                  <SelectValue
                    placeholder={
                      eventType === "faculty_unavailable"
                        ? "Select faculty"
                        : "Select room"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-56 [&_[data-radix-select-viewport]]:max-h-56 [&_[data-radix-select-viewport]]:overflow-y-auto">
                  {selectableEntities.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Day Scope</Label>
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any day</SelectItem>
                {constraints.days.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Slot Scope</Label>
            <Select value={slotFilter} onValueChange={setSlotFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56 [&_[data-radix-select-viewport]]:max-h-56 [&_[data-radix-select-viewport]]:overflow-y-auto">
                <SelectItem value="__any__">Any slot</SelectItem>
                {slotLabels.map((slotLabel) => (
                  <SelectItem key={slotLabel} value={slotLabel}>
                    {slotLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Faculty illness"
              className="h-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={analyzeEmergencyImpact} disabled={isAnalyzing || !activeVariant}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            {isAnalyzing ? "Analyzing..." : "Analyze Impact"}
          </Button>
          <p className="text-xs text-brand-text-secondary">
            Works on the currently selected variant.
          </p>
        </div>

        {analysis ? (
          <div className="space-y-3 rounded-md border border-brand-border bg-card/70 p-3">
            <p className="text-sm text-brand-text-secondary">{analysis.message}</p>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                Impacted classes: {analysis.impactedSlots.length}
              </Badge>
              <Badge variant="outline">Proposals: {analysis.proposals.length}</Badge>
            </div>

            {analysis.impactedSlots.length > 0 ? (
              <div className="thin-scrollbar max-h-36 overflow-y-auto rounded-md border border-brand-border p-2 text-xs">
                {analysis.impactedSlots.map((slot, index) => (
                  <p key={`${slot.day}-${slot.slotLabel}-${slot.subject}-${index}`}>
                    {slot.day} {slot.slotLabel}: {slot.subject} ({slot.faculty}, {slot.room})
                  </p>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 xl:grid-cols-3">
              {analysis.proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="rounded-md border border-brand-border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-brand-text">{proposal.label}</p>
                    <Badge
                      variant={proposal.unresolvedCount > 0 ? "destructive" : "secondary"}
                    >
                      {proposal.unresolvedCount > 0
                        ? `${proposal.unresolvedCount} unresolved`
                        : "Resolvable"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-brand-text-secondary">{proposal.summary}</p>
                  <p className="mt-2 text-xs text-brand-text-secondary">
                    Disruption score: {proposal.disruptionScore}
                  </p>
                  <p className="text-xs text-brand-text-secondary">
                    Changes: {proposal.changes.length}
                  </p>
                  <Button
                    className="mt-3 h-8 w-full"
                    variant="outline"
                    disabled={
                      proposal.unresolvedCount > 0 || applyingProposalId !== null
                    }
                    onClick={() => applyProposal(proposal.id)}
                  >
                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                    {applyingProposalId === proposal.id
                      ? "Applying..."
                      : "Apply This Option"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


