"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Mail, Plus, ShieldAlert, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Workspace, PlanFeatures } from "@/lib/types";

interface WorkspaceSettingsProps {
  features: PlanFeatures | null;
  isLoading: boolean;
}

export function WorkspaceSettings({ features, isLoading }: WorkspaceSettingsProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "viewer">("viewer");
  const [isInviting, setIsInviting] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) {
          const data = await res.json();
          if (data.workspaces) {
            setWorkspaces(data.workspaces);
          }
        }
      } catch (e) {
        console.error("Failed to load workspaces", e);
      } finally {
        setIsFetching(false);
      }
    }
    
    if (features?.adminSeats && features.adminSeats > 1) {
      fetchWorkspaces();
    } else {
      setIsFetching(false);
    }
  }, [features?.adminSeats]);

  const activeWorkspace = workspaces[0];

  const handleInvite = async () => {
    if (!activeWorkspace) return;
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsInviting(true);
    setInviteLink(null);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to invite member.");
      }

      toast.success(`Invitation sent to ${inviteEmail}.`);
      if (data.inviteUrl) {
        setInviteLink(data.inviteUrl);
      } else {
        setIsInviteDialogOpen(false);
        setInviteEmail("");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send invitation.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeWorkspace) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to remove member.");
      }

      toast.success("Member removed successfully.");
      setWorkspaces((prev) => 
        prev.map(ws => 
          ws.id === activeWorkspace.id 
            ? { ...ws, members: ws.members.filter(m => m.userId !== userId) }
            : ws
        )
      );
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading || isFetching) {
    return (
      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-4 w-4 text-secondary" />
            Team Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6 text-sm text-brand-text-secondary">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading workspace settings...
        </CardContent>
      </Card>
    );
  }

  if (!features || features.adminSeats <= 1) {
    return (
      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-4 w-4 text-secondary" />
            Team Workspace (Department)
          </CardTitle>
          <CardDescription>
            Collaborate on timetables with your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-4 bg-secondary/5 border-secondary/20 flex items-start gap-4">
            <ShieldAlert className="h-8 w-8 text-brand-text-secondary shrink-0 mt-1" />
            <div>
              <p className="text-sm font-medium text-brand-text">Institution Plan required</p>
              <p className="mt-1 text-xs text-brand-text-secondary leading-relaxed">
                Team collaboration allows you to invite admins and viewers to your workspace so they can view, generate, or export timetables alongside you. Upgrade to the Institution plan to unlock this feature.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeWorkspace) {
    return (
      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-4 w-4 text-secondary" />
            Team Workspace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-6 text-center text-sm text-brand-text-secondary">
            No workspace found. Please contact support.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-4 w-4 text-secondary" />
            Team Workspace: {activeWorkspace.name}
          </CardTitle>
          <CardDescription>
            Manage who has access to your timetables and data.
          </CardDescription>
        </div>
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an email invitation to collaborate on your timetables.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    placeholder="colleague@university.edu" 
                    type="email"
                    className="pl-9"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v: "admin" | "viewer") => setInviteRole(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Can edit and generate)</SelectItem>
                    <SelectItem value="viewer">Viewer (Can only view and export)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {inviteLink && (
                <div className="mt-4 rounded-md border border-cyan-500/30 bg-cyan-500/10 p-3">
                  <p className="text-xs text-brand-text-secondary mb-2">
                    In development mode, copy this link directly:
                  </p>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteLink} className="h-8 text-xs font-mono" />
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-8 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        toast.success("Link copied!");
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={isInviting}>
                {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invite
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <div className="bg-card px-4 py-3 border-b grid grid-cols-12 gap-4 items-center">
            <div className="col-span-6 md:col-span-5 text-sm font-semibold text-brand-text">Member</div>
            <div className="col-span-3 md:col-span-4 text-sm font-semibold text-brand-text">Role</div>
            <div className="col-span-3 text-right text-sm font-semibold text-brand-text">Actions</div>
          </div>
          <div className="divide-y">
            {activeWorkspace.members.map((member) => (
              <div key={member.userId} className="bg-card/50 px-4 py-3 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-xs font-semibold text-secondary">
                    {member.email[0].toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-brand-text truncate">{member.email}</p>
                    <p className="text-[10px] text-brand-text-secondary uppercase">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="col-span-3 md:col-span-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize border ${
                    member.role === 'owner' ? 'bg-primary/10 text-primary border-primary/20' :
                    member.role === 'admin' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                    'bg-muted text-muted-foreground border-border'
                  }`}>
                    {member.role}
                  </span>
                </div>
                <div className="col-span-3 flex justify-end">
                  {member.role !== 'owner' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMember(member.userId)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


