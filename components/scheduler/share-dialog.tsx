"use client";

import { useState } from "react";
import { Link2, Copy, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TimetableVariant, SchedulerConstraints } from "@/lib/types";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: TimetableVariant | null;
  constraints: SchedulerConstraints;
  days: string[];
  slotLabels: string[];
}

export function ShareDialog({ open, onOpenChange, variant, constraints, days, slotLabels }: ShareDialogProps) {
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copiedLinks, setCopiedLinks] = useState<Record<string, boolean>>({});

  const handleCreateShare = async () => {
    if (!variant || shareLoading) return;
    setShareLoading(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant,
          constraints,
          days,
          slotLabels,
        }),
      });
      if (!response.ok) throw new Error("Share failed");
      const data = await response.json();
      setShareUrl(data.shareUrl);
    } catch {
      toast.error("Failed to create share link.");
    } finally {
      setShareLoading(false);
    }
  };

  // Generate on mount if not exist
  if (open && !shareUrl && !shareLoading && variant) {
    handleCreateShare();
  }

  const handleCopy = (text: string, id: string = "master") => {
    navigator.clipboard.writeText(text);
    setCopiedLinks({ ...copiedLinks, [id]: true });
    toast.success("Link copied!");
    setTimeout(() => {
      setCopiedLinks((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const handleCopyAllFaculty = () => {
    if (!shareUrl) return;
    const textBase = "Timetable Links:\n\nMaster Timetable: " + shareUrl + "\n\nFaculty Links:\n";
    const facultyLinks = constraints.faculties
      .map((f) => `- ${f.name}: ${shareUrl}?faculty=${encodeURIComponent(f.name)}`)
      .join("\n");
    navigator.clipboard.writeText(textBase + facultyLinks);
    toast.success("All links copied!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Timetable</DialogTitle>
          <DialogDescription>
            Anyone with the link can view this timetable in read-only mode.
          </DialogDescription>
        </DialogHeader>

        {shareLoading || !shareUrl ? (
          <div className="flex h-40 flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            <p className="text-sm text-brand-text-secondary">Generating secure link...</p>
          </div>
        ) : (
          <Tabs defaultValue="master" className="mt-4 w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5">
              <TabsTrigger value="master">Master View</TabsTrigger>
              <TabsTrigger value="faculty">Faculty Views</TabsTrigger>
            </TabsList>
            
            <TabsContent value="master" className="mt-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-brand-text">General Share Link</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={shareUrl} className="bg-background/50 shadow-inner" />
                  <Button
                    size="icon"
                    onClick={() => handleCopy(shareUrl)}
                    className="shrink-0 transition-all"
                  >
                    {copiedLinks["master"] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-brand-text-secondary">
                  This link shows the entire generated timetable for all departments and faculty. Link expires in 30 days.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="faculty" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-brand-text">Personal Links</p>
                <Button variant="outline" size="sm" onClick={handleCopyAllFaculty} className="h-7 text-xs">
                  Copy All
                </Button>
              </div>
              <p className="text-xs text-brand-text-secondary">
                These links automatically filter the timetable to show only the slots assigned to that specific faculty member.
              </p>
              
              <div className="thin-scrollbar mt-2 flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
                {constraints.faculties.map((faculty) => {
                  const url = `${shareUrl}?faculty=${encodeURIComponent(faculty.name)}`;
                  return (
                    <div key={faculty.name} className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/5 p-2">
                      <span className="text-sm font-medium text-brand-text">{faculty.name}</span>
                      <div className="flex gap-2">
                        <Input readOnly value={url} className="h-8 bg-background/50 text-xs shadow-inner" />
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleCopy(url, faculty.name)}
                        >
                          {copiedLinks[faculty.name] ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}


