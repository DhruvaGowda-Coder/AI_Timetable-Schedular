"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

interface OnboardingWizardProps {
  onComplete: () => void;
}

interface OnboardingSubject {
  name: string;
  weeklyHours: number;
}

interface OnboardingFaculty {
  name: string;
  canTeach: string[];
}

const DEFAULT_SUBJECTS: OnboardingSubject[] = [
  { name: "Mathematics", weeklyHours: 4 },
  { name: "Physics", weeklyHours: 3 },
  { name: "Computer Science", weeklyHours: 3 },
];

const DEFAULT_FACULTY: OnboardingFaculty[] = [
  { name: "Dr. Sharma", canTeach: ["Mathematics"] },
  { name: "Prof. Nair", canTeach: ["Physics"] },
  { name: "Ms. Gupta", canTeach: ["Computer Science"] },
];

const STEP_ICONS = [Sparkles, BookOpen, Users, GraduationCap];
const STEP_TITLES = [
  "Welcome to Schedulr AI",
  "Add Your Subjects",
  "Add Your Faculty",
  "Generate Your Timetable",
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [subjects, setSubjects] = useState<OnboardingSubject[]>(DEFAULT_SUBJECTS);
  const [faculties, setFaculties] = useState<OnboardingFaculty[]>(DEFAULT_FACULTY);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const progress = ((step + 1) / 4) * 100;

  async function handleSkip() {
    await completeOnboarding();
  }

  async function completeOnboarding() {
    try {
      await fetch("/api/onboarding", { method: "POST" });
    } catch {
      // Silently continue — the user can still use the app
    }
    onComplete();
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      // Build constraints from wizard data
      const constraints = {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        slotsPerDay: 6,
        slotTimings: [
          { start: "09:00", end: "09:50" },
          { start: "10:00", end: "10:50" },
          { start: "11:00", end: "11:50" },
          { start: "12:30", end: "13:20" },
          { start: "13:30", end: "14:20" },
          { start: "14:30", end: "15:20" },
        ],
        subjects: subjects
          .filter((s) => s.name.trim())
          .map((s) => ({ name: s.name, weeklyHours: s.weeklyHours, maxPerDay: 2 })),
        faculties: faculties
          .filter((f) => f.name.trim())
          .map((f) => ({
            name: f.name,
            canTeach: f.canTeach,
            unavailableDays: [],
          })),
        rooms: [
          { name: "Room 101", capacity: 60 },
          { name: "Room 102", capacity: 40 },
        ],
      };

      const response = await fetch("/api/scheduler/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ constraints, count: 1 }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      setGenerated(true);
      toast.success("Timetable generated! Head to the Scheduler to view it.");
    } catch {
      toast.error("Generation failed. You can try again from the Scheduler page.");
      setGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleNext() {
    if (step < 3) {
      setStep((prev) => prev + 1);
    } else {
      completeOnboarding();
    }
  }

  function updateSubject(index: number, patch: Partial<OnboardingSubject>) {
    setSubjects((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  function updateFaculty(index: number, patch: Partial<OnboardingFaculty>) {
    setFaculties((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  }

  const StepIcon = STEP_ICONS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative mx-4 w-full max-w-lg rounded-2xl border border-brand-border/50 bg-card shadow-2xl"
      >
        {/* Gradient top */}
        <div className="h-[3px] rounded-t-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500" />

        {/* Progress bar */}
        <div className="px-6 pt-5">
          <div className="mb-1 flex items-center justify-between text-xs text-brand-text-secondary">
            <span>Step {step + 1} of 4</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Step icon + title */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                  <StepIcon className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-text">
                    {STEP_TITLES[step]}
                  </h2>
                  {step === 0 && (
                    <p className="text-sm text-brand-text-secondary">
                      Let&apos;s set up your first timetable in 2 minutes.
                    </p>
                  )}
                </div>
              </div>

              {/* Step 0: Welcome */}
              {step === 0 && (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-brand-text-secondary">
                    Schedulr AI uses a genetic algorithm to create
                    conflict-free timetables optimized for your constraints.
                    In the next 3 steps, we&apos;ll add some subjects and faculty
                    to generate your first schedule.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {["Add Subjects", "Map Faculty", "Generate"].map(
                      (label, i) => (
                        <div
                          key={label}
                          className="rounded-lg border border-brand-border/50 bg-brand-border/5 p-3 text-center"
                        >
                          <div className="mb-1 text-lg font-bold text-brand-text">
                            {i + 1}
                          </div>
                          <div className="text-xs text-brand-text-secondary">
                            {label}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Step 1: Subjects */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-brand-text-secondary">
                    Edit the example subjects or add your own. You can always
                    change these later.
                  </p>
                  <div className="thin-scrollbar max-h-48 space-y-2 overflow-y-auto">
                    {subjects.map((subject, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 rounded-md border border-brand-border/50 p-2"
                      >
                        <div className="col-span-8">
                          <Label className="text-xs">Subject</Label>
                          <Input
                            value={subject.name}
                            onChange={(e) =>
                              updateSubject(idx, { name: e.target.value })
                            }
                            placeholder="e.g. Mathematics"
                          />
                        </div>
                        <div className="col-span-4">
                          <Label className="text-xs">Hours/wk</Label>
                          <Input
                            type="number"
                            min={1}
                            max={8}
                            value={subject.weeklyHours}
                            onChange={(e) =>
                              updateSubject(idx, {
                                weeklyHours: Number(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSubjects((prev) => [
                        ...prev,
                        { name: "", weeklyHours: 2 },
                      ])
                    }
                  >
                    + Add Subject
                  </Button>
                </div>
              )}

              {/* Step 2: Faculty */}
              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-brand-text-secondary">
                    Assign faculty to subjects. Each faculty member can teach
                    one or more subjects.
                  </p>
                  <div className="thin-scrollbar max-h-52 space-y-2 overflow-y-auto">
                    {faculties.map((faculty, idx) => (
                      <div
                        key={idx}
                        className="space-y-2 rounded-md border border-brand-border/50 p-2"
                      >
                        <div>
                          <Label className="text-xs">Faculty Name</Label>
                          <Input
                            value={faculty.name}
                            onChange={(e) =>
                              updateFaculty(idx, { name: e.target.value })
                            }
                            placeholder="e.g. Dr. Sharma"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {subjects
                            .filter((s) => s.name.trim())
                            .map((s) => {
                              const checked = faculty.canTeach.includes(s.name);
                              return (
                                <label
                                  key={s.name}
                                  className="flex items-center gap-1.5 rounded border border-brand-border/50 px-2 py-1 text-xs"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(val) => {
                                      const set = new Set(faculty.canTeach);
                                      if (val) set.add(s.name);
                                      else set.delete(s.name);
                                      updateFaculty(idx, {
                                        canTeach: Array.from(set),
                                      });
                                    }}
                                  />
                                  {s.name}
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFaculties((prev) => [
                        ...prev,
                        { name: "", canTeach: [] },
                      ])
                    }
                  >
                    + Add Faculty
                  </Button>
                </div>
              )}

              {/* Step 3: Generate */}
              {step === 3 && (
                <div className="space-y-4">
                  {!generated ? (
                    <>
                      <p className="text-sm text-brand-text-secondary">
                        Everything is set! Click below to generate your first
                        AI-optimized timetable.
                      </p>
                      <div className="rounded-lg border border-brand-border/50 bg-brand-border/5 p-4">
                        <h4 className="mb-2 text-sm font-semibold text-brand-text">
                          Your Setup:
                        </h4>
                        <div className="space-y-1 text-xs text-brand-text-secondary">
                          <p>
                            📚{" "}
                            {subjects.filter((s) => s.name.trim()).length}{" "}
                            subjects (
                            {subjects
                              .filter((s) => s.name.trim())
                              .map((s) => s.name)
                              .join(", ")}
                            )
                          </p>
                          <p>
                            👩‍🏫{" "}
                            {faculties.filter((f) => f.name.trim()).length}{" "}
                            faculty members
                          </p>
                          <p>🏫 2 rooms (auto-assigned)</p>
                          <p>📅 Monday–Friday, 6 periods/day</p>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {isGenerating
                          ? "Generating..."
                          : "Generate My Timetable"}
                      </Button>
                    </>
                  ) : (
                    <div className="py-4 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                        <GraduationCap className="h-6 w-6 text-emerald-400" />
                      </div>
                      <h3 className="mb-1 text-lg font-bold text-brand-text">
                        You&apos;re All Set! 🎉
                      </h3>
                      <p className="mb-4 text-sm text-brand-text-secondary">
                        Your timetable is ready. Head to the Scheduler page to
                        view, edit, and export it.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-brand-border/50 px-6 py-4">
          <button
            onClick={handleSkip}
            className="text-xs text-brand-text-secondary underline-offset-4 hover:underline"
          >
            Skip setup
          </button>
          <Button size="sm" onClick={handleNext} className="gap-1">
            {step === 3 ? (generated ? "Go to Scheduler" : "Skip") : "Next"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}


