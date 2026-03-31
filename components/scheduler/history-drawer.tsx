"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { History, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SchedulerConstraints, TimetableVariant } from "@/lib/types";

interface HistoryData {
  id: string;
  createdAt: string;
  constraints: SchedulerConstraints;
  variants: TimetableVariant[];
}

interface HistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (constraints: SchedulerConstraints, variants: TimetableVariant[]) => void;
  planName?: string;
}

export function HistoryDrawer({ open, onOpenChange, onRestore, planName }: HistoryDrawerProps) {
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scheduler/history");
      if (!res.ok) throw new Error("Failed to load history.");
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      toast.error("Failed to fetch timetable history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchHistory();
  }, [open]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/scheduler/history/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Deletion failed");
      toast.success("History variant deleted.");
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch {
      toast.error("Failed to delete history item.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md glass-card border-l border-brand-border/40 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-brand-text">
            <History className="h-5 w-5 text-purple-400" />
            Version History
          </SheetTitle>
          <SheetDescription className="text-brand-text-secondary">
            View and restore past timetable generations. 
            {planName === "free" && " (Free plan retains 3 generations limit)."}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-brand-text-secondary">
            <History className="mb-4 h-12 w-12 opacity-20" />
            <p>No timetable history found.</p>
            <p className="mt-2 text-xs">Generate new timetables to see them here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-12">
            {history.map((item) => (
              <Card 
                key={item.id} 
                className="cursor-pointer surface-card hover:border-purple-500/50 transition-colors"
                onClick={() => {
                  onRestore(item.constraints, item.variants);
                  onOpenChange(false);
                  toast.success("Timetable version restored!");
                }}
              >
                <CardContent className="p-4 relative group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-brand-text">
                      {item.variants.length > 0 ? item.variants[0].name : "Timetable Variant"}
                    </span>
                    <Badge variant={item.variants[0]?.score >= 90 ? "default" : "secondary"}>
                      Score {(item.variants[0]?.score || 0).toFixed(0)}%
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-brand-text-secondary space-y-1">
                    <p>Constraints: {item.constraints.subjects.length} subjects</p>
                    <p>Variants Generated: {item.variants.length}</p>
                    <p>Saved {formatDistanceToNow(new Date(item.createdAt))} ago</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-2 right-2 h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    disabled={deletingId === item.id}
                    onClick={(e) => handleDelete(item.id, e)}
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}


