"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Lock,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AIExplanation,
  PlanFeatures,
  SchedulerConstraints,
  TimetableVariant,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AIInsightsCardProps {
  activeVariant: TimetableVariant | undefined;
  constraints: SchedulerConstraints;
  billingFeatures: PlanFeatures;
}

export function AIInsightsCard({
  activeVariant,
  constraints,
  billingFeatures,
}: AIInsightsCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastExplainedVariantId = useRef<string | null>(null);

  const fetchExplanation = useCallback(async () => {
    if (!activeVariant || !billingFeatures.aiExplanations) return;
    if (lastExplainedVariantId.current === activeVariant.id && explanation) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/scheduler/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant: activeVariant, constraints }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Failed to get AI insights.");
      }

      const data = await response.json();
      setExplanation(data.explanation);
      lastExplainedVariantId.current = activeVariant.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI insights unavailable.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeVariant, billingFeatures.aiExplanations, constraints, explanation]);

  // Reset when variant changes
  useEffect(() => {
    if (activeVariant && lastExplainedVariantId.current !== activeVariant.id) {
      setExplanation(null);
      setError(null);
    }
  }, [activeVariant?.id]);

  function handleToggle() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && !explanation && !isLoading && billingFeatures.aiExplanations) {
      fetchExplanation();
    }
  }

  if (!activeVariant) return null;

  const isLocked = !billingFeatures.aiExplanations;

  return (
    <Card className="surface-card overflow-hidden border-brand-border/70">
      {/* Gradient top accent */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500" />

      <CardHeader
        className="cursor-pointer select-none"
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </span>
            AI Insights
            {isLocked && (
              <Badge variant="outline" className="ml-2 gap-1 border-amber-500/50 text-amber-500">
                <Lock className="h-3 w-3" />
                Pro+
              </Badge>
            )}
          </CardTitle>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-brand-text-secondary" />
          </motion.div>
        </div>
        <p className="mt-1 text-sm text-brand-text-secondary">
          {isLocked
            ? "Upgrade to Pro to unlock AI-powered timetable analysis."
            : "AI-powered analysis of your timetable — why this schedule works."}
        </p>
      </CardHeader>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0">
              {isLocked ? (
                <div className="relative">
                  {/* Blurred fake content */}
                  <div className="select-none blur-sm" aria-hidden>
                    <p className="mb-3 text-sm text-brand-text-secondary">
                      This timetable efficiently distributes 43 weekly hours across 6 days with minimal faculty conflicts. The genetic algorithm optimized for room balance and workload distribution.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                        <span>Dr. Meera Rao handles Mathematics and Statistics efficiently across Mon-Thu.</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                        <span>Room A-101 is utilized at 85%, optimal for a 60-capacity hall.</span>
                      </div>
                    </div>
                  </div>
                  {/* Upgrade overlay */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm">
                    <div className="text-center">
                      <Lock className="mx-auto mb-2 h-6 w-6 text-amber-500" />
                      <p className="mb-2 text-sm font-medium text-brand-text">
                        AI Insights locked
                      </p>
                      <p className="mb-3 text-xs text-brand-text-secondary">
                        Upgrade to Pro plan or above
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = "/billing";
                        }}
                      >
                        Upgrade Plan
                      </Button>
                    </div>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                  <div className="space-y-2">
                    <div className="h-4 w-72 animate-pulse rounded bg-brand-border/50" />
                    <div className="h-3 w-56 animate-pulse rounded bg-brand-border/40" />
                    <div className="h-3 w-64 animate-pulse rounded bg-brand-border/30" />
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchExplanation();
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : explanation ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <p className="text-sm leading-relaxed text-brand-text-secondary">
                    {explanation.summary}
                  </p>

                  {/* Highlights */}
                  {explanation.highlights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
                        <Lightbulb className="h-3.5 w-3.5 text-blue-400" />
                        Key Decisions
                      </h4>
                      <div className="space-y-1.5">
                        {explanation.highlights.map((highlight, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-md border border-brand-border/50 bg-blue-500/5 px-3 py-2 text-sm text-brand-text-secondary"
                          >
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                            {highlight}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {explanation.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-500">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Heads Up
                      </h4>
                      <div className="space-y-1.5">
                        {explanation.warnings.map((warning, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200/80"
                          >
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-brand-text-secondary">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchExplanation();
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze This Timetable
                  </Button>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}


