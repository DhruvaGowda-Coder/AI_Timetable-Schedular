"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  LayoutTemplate,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SchedulerConstraints } from "@/lib/types";

interface TemplateData {
  id: string;
  name: string;
  description: string;
  constraints: SchedulerConstraints;
  createdAt: string;
  usageCount: number;
}

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  constraints: SchedulerConstraints;
  templateLimit: number;
  onLoad: (constraints: SchedulerConstraints) => void;
}

export function TemplatesDialog({
  open,
  onOpenChange,
  constraints,
  templateLimit,
  onLoad,
}: TemplatesDialogProps) {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      toast.error("Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open]);

  const handleSave = async () => {
    if (!newName.trim()) {
      toast.error("Template name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          constraints,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save.");

      toast.success("Template saved!");
      setNewName("");
      setNewDescription("");
      await fetchTemplates();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save template."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/templates/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      onLoad(data.template.constraints);
      onOpenChange(false);
    } catch {
      toast.error("Failed to load template.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Template deleted.");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("Failed to delete template.");
    } finally {
      setDeletingId(null);
    }
  };

  const limitText =
    templateLimit < 0
      ? "Unlimited"
      : `${templates.length} / ${templateLimit}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-emerald-400" />
            Schedule Templates
          </DialogTitle>
          <DialogDescription>
            Save your constraint configurations as reusable templates. ({limitText})
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library" className="mt-2 w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="library">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Library
            </TabsTrigger>
            <TabsTrigger value="save">
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Current
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center text-brand-text-secondary">
                <LayoutTemplate className="mb-3 h-10 w-10 opacity-20" />
                <p className="text-sm">No templates saved yet.</p>
                <p className="mt-1 text-xs">
                  Switch to &quot;Save Current&quot; to create your first template.
                </p>
              </div>
            ) : (
              <div className="thin-scrollbar max-h-72 space-y-2.5 overflow-y-auto pr-1">
                <AnimatePresence>
                  {templates.map((template, i) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card
                        className="group cursor-pointer surface-card hover:border-emerald-500/40 transition-colors"
                        onClick={() => handleLoad(template.id)}
                      >
                        <CardContent className="relative p-3.5">
                          <div className="mb-1.5 flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-brand-text">
                              {template.name}
                            </h4>
                            <Badge variant="secondary" className="text-[10px]">
                              {template.constraints.subjects?.length || 0} subjects
                            </Badge>
                          </div>
                          {template.description && (
                            <p className="mb-2 text-xs text-brand-text-secondary line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[11px] text-brand-text-secondary">
                            <span>
                              {template.constraints.faculties?.length || 0} faculty
                              · {template.constraints.rooms?.length || 0} rooms
                              · Used {template.usageCount}×
                            </span>
                            <span>
                              {new Date(template.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {loadingId === template.id && (
                              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              disabled={deletingId === template.id}
                              onClick={(e) => handleDelete(template.id, e)}
                            >
                              {deletingId === template.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="save" className="mt-4 space-y-4">
            <div className="rounded-lg border border-brand-border/40 bg-card/50 p-4">
              <h4 className="mb-1 text-sm font-semibold text-brand-text">
                Current Configuration Summary
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-brand-text-secondary">
                <span>📚 {constraints.subjects.length} subjects</span>
                <span>👩‍🏫 {constraints.faculties.length} faculty</span>
                <span>🏫 {constraints.rooms.length} rooms</span>
                <span>
                  📅 {constraints.days.length} days,{" "}
                  {constraints.slotsPerDay} slots/day
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Template Name *</Label>
                <Input
                  placeholder="e.g. CS 2nd Year — Spring 2025"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description (optional)</Label>
                <Input
                  placeholder="Brief notes about this template"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                disabled={saving || !newName.trim()}
                onClick={handleSave}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Save as Template
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


