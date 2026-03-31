"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Eye, ExternalLink, Sparkles } from "lucide-react";
import { TimetableGrid } from "@/components/scheduler/timetable-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimetableSlot } from "@/lib/types";

interface ShareData {
  variantData: {
    name: string;
    score: number;
    slots: TimetableSlot[];
  };
  days: string[];
  slotLabels: string[];
  viewCount: number;
  createdAt: string;
}

export function SharePageClient({ shareId, faculty }: { shareId: string, faculty?: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShare() {
      try {
        const url = faculty ? `/api/share/${shareId}?faculty=${encodeURIComponent(faculty)}` : `/api/share/${shareId}`;
        const response = await fetch(url);
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(
            body?.message ??
              (response.status === 404
                ? "This timetable was not found."
                : response.status === 410
                ? "This share link has expired."
                : "Failed to load timetable.")
          );
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load timetable."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchShare();
  }, [shareId, faculty]);

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient mesh background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb-blue" />
        <div className="orb-purple" />
      </div>

      {/* CTA Banner */}
      <div className="border-b border-brand-border/50 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-cyan-600/10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-medium text-brand-text">
              Create your own AI-powered timetable with{" "}
              <span className="gradient-text font-bold">Schedulr AI</span>
            </span>
          </div>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => (window.location.href = "/")}
          >
            Get Started
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64 rounded-md" />
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-[300px] w-full rounded-md" />
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="surface-card mx-auto max-w-md border-destructive/30">
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <Calendar className="h-6 w-6 text-destructive" />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-brand-text">
                  Timetable Not Available
                </h2>
                <p className="text-sm text-brand-text-secondary">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => (window.location.href = "/")}
                >
                  Create Your Own
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : data ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-brand-text">
                  {faculty ? `${faculty}'s Timetable` : (data.variantData.name || "Shared Timetable")}
                </h1>
                <p className="mt-1 text-sm text-brand-text-secondary">
                  Generated by Schedulr AI · Score: {data.variantData.score}%
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="gap-1 border-brand-border/50"
                >
                  <Eye className="h-3 w-3" />
                  {data.viewCount} view{data.viewCount !== 1 ? "s" : ""}
                </Badge>
                {data.createdAt && (
                  <span className="text-xs text-brand-text-secondary">
                    {new Date(data.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Timetable Grid */}
            <Card className="surface-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-4 w-4 text-secondary" />
                  Timetable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TimetableGrid
                  days={data.days}
                  slotLabels={data.slotLabels}
                  slots={data.variantData.slots}
                />
              </CardContent>
            </Card>

            {/* Footer CTA */}
            <Card className="surface-card border-purple-500/30 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5">
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <Sparkles className="h-8 w-8 text-purple-400" />
                <h2 className="text-lg font-bold text-brand-text">
                  Build Your Own AI Timetable
                </h2>
                <p className="max-w-md text-sm text-brand-text-secondary">
                  Add your subjects, faculty, and rooms — our AI generates
                  optimized timetables with conflict-free scheduling in seconds.
                </p>
                <Button
                  className="mt-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                  onClick={() => (window.location.href = "/signup")}
                >
                  Get Started Free
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
