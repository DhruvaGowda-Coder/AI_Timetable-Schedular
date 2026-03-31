"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Plus,
  Mail,
  ShieldAlert,
  KeyRound,
  Copy,
  Trash2,
  Users,
  Lock,
  Crown,
  Shield,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Workspace, WorkspaceMember, BillingSummary } from "@/lib/types";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
}

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  viewer: Eye,
} as const;

const ROLE_COLORS = {
  owner: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  admin: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  viewer: "bg-slate-500/20 text-slate-400 border-slate-500/40",
} as const;

export function WorkspaceSettingsClient() {
  const { data: session } = useSession();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    null
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [teamSupport, setTeamSupport] = useState(false);
  const [billingLoaded, setBillingLoaded] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "viewer">("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) return;
      const data = await res.json();
      setWorkspaces(data.workspaces || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    const cookieWId = getCookie("schedulr_workspace_id");
    setActiveWorkspaceId(cookieWId || session.user.id);
    fetchWorkspaces();

    // Fetch billing to check team support
    fetch("/api/billing")
      .then((r) => r.json())
      .then((data: BillingSummary) => {
        setTeamSupport(data.features?.adminSeats ? data.features.adminSeats > 1 : false);
        setBillingLoaded(true);
      })
      .catch(() => setBillingLoaded(true));
  }, [session?.user?.id]);

  if (!session?.user?.id) return null;

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const isPersonal = activeWorkspaceId === session.user?.id;
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const currentUserMember = activeWorkspace?.members.find(
    (m) => m.userId === session.user?.id
  );
  const canInvite =
    currentUserMember?.role === "owner" || currentUserMember?.role === "admin";
  const canRemove =
    currentUserMember?.role === "owner" || currentUserMember?.role === "admin";

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to create workspace");
      toast.success("Workspace created!");
      setNewWorkspaceName("");
      await fetchWorkspaces();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create workspace."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspace) return;
    setInviting(true);
    setInviteLink(null);
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to invite user");

      toast.success(`Invitation sent to ${inviteEmail} as ${inviteRole}`);
      if (data.inviteUrl) {
        setInviteLink(data.inviteUrl);
      }
      setInviteEmail("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to invite user."
      );
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!activeWorkspace) return;
    if (
      !window.confirm("Are you sure you want to remove this member?")
    )
      return;

    setRemovingId(targetUserId);
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/members`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: targetUserId }),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to remove member");

      toast.success("Member removed.");
      await fetchWorkspaces();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove member."
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Plan Gate Banner */}
      {billingLoaded && !teamSupport && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="surface-card overflow-hidden border-amber-500/30">
            <div className="h-[2px] w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                <Lock className="h-6 w-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-brand-text">
                  Team Support — Department+ Required
                </h3>
                <p className="text-sm text-brand-text-secondary">
                  Create team workspaces and invite collaborators to manage
                  timetables together. Available on Department plans and above.
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                onClick={() => (window.location.href = "/billing")}
              >
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Current Workspace Info */}
      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Current Workspace
          </CardTitle>
          <CardDescription>
            You are currently working in{" "}
            {isPersonal
              ? "your Personal Workspace"
              : `the "${activeWorkspace?.name}" workspace`}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPersonal ? (
            <div className="rounded-lg border border-brand-border/40 bg-card/50 p-6 text-center">
              <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold text-brand-text">
                Personal Workspace
              </h3>
              <p className="mb-4 text-sm text-brand-text-secondary">
                This is your private workspace. To collaborate with others,
                create a Team Workspace below.
              </p>
            </div>
          ) : activeWorkspace ? (
            <div className="space-y-6">
              {/* Member List */}
              <div>
                <Label className="mb-2 inline-flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4 text-blue-400" />
                  Team Members ({activeWorkspace.members.length})
                </Label>
                <div className="mt-2 rounded-lg border border-brand-border/40 bg-background/50 overflow-hidden">
                  <AnimatePresence>
                    {activeWorkspace.members.map(
                      (member: WorkspaceMember, idx: number) => {
                        const RoleIcon =
                          ROLE_ICONS[
                            member.role as keyof typeof ROLE_ICONS
                          ] || Eye;
                        const roleColor =
                          ROLE_COLORS[
                            member.role as keyof typeof ROLE_COLORS
                          ] || ROLE_COLORS.viewer;
                        const isOwner =
                          member.userId === activeWorkspace.ownerId;
                        const isSelf =
                          member.userId === session.user?.id;

                        return (
                          <motion.div
                            key={member.userId}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`group flex items-center justify-between p-3.5 ${
                              idx !== activeWorkspace.members.length - 1
                                ? "border-b border-brand-border/40"
                                : ""
                            } hover:bg-white/[0.02] transition-colors`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-sm font-semibold text-blue-300">
                                {member.email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-brand-text">
                                  {member.email}
                                  {isSelf && (
                                    <span className="ml-1.5 text-xs text-brand-text-secondary">
                                      (You)
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-brand-text-secondary">
                                  Joined{" "}
                                  {new Date(
                                    member.joinedAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`gap-1 ${roleColor}`}
                              >
                                <RoleIcon className="h-3 w-3" />
                                {member.role}
                              </Badge>
                              {canRemove && !isOwner && !isSelf && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={removingId === member.userId}
                                  onClick={() =>
                                    handleRemoveMember(member.userId)
                                  }
                                >
                                  {removingId === member.userId ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      }
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Invite Section */}
              {canInvite && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-5"
                >
                  <h4 className="mb-1 flex items-center gap-2 font-medium text-brand-text">
                    <Mail className="h-4 w-4 text-purple-400" />
                    Invite Collaborators
                  </h4>
                  <p className="mb-3 text-sm text-brand-text-secondary">
                    Send an email invitation to let others view or edit
                    your timetables.
                  </p>
                  <form
                    onSubmit={handleInvite}
                    className="flex flex-col gap-3 sm:flex-row sm:items-end"
                  >
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        placeholder="colleague@university.edu"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="w-full space-y-1 sm:w-32">
                      <Label className="text-xs">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(v) =>
                          setInviteRole(v as "admin" | "viewer")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      disabled={inviting || !inviteEmail}
                      className="w-full sm:w-auto"
                    >
                      {inviting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Invite
                        </>
                      )}
                    </Button>
                  </form>
                  {inviteLink && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs">
                      <KeyRound className="h-4 w-4 shrink-0 text-blue-400" />
                      <span className="flex-1 truncate font-mono text-brand-text">
                        {inviteLink}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteLink);
                          toast.success("Link copied!");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Role Permissions Guide */}
              <div className="rounded-lg border border-brand-border/30 bg-card/50 p-4">
                <h4 className="mb-2 text-sm font-semibold text-brand-text">
                  Role Permissions
                </h4>
                <div className="grid gap-2 text-xs text-brand-text-secondary sm:grid-cols-3">
                  <div className="flex items-start gap-2 rounded-md bg-amber-500/5 p-2.5">
                    <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <div>
                      <strong className="text-brand-text">Owner</strong>
                      <p>Full control. Generate, edit, export, manage team.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-md bg-blue-500/5 p-2.5">
                    <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                    <div>
                      <strong className="text-brand-text">Admin</strong>
                      <p>Generate, edit, export. Can invite members.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-md bg-slate-500/5 p-2.5">
                    <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div>
                      <strong className="text-brand-text">Viewer</strong>
                      <p>View and export only. No editing or generation.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-destructive">
              Workspace not found or access denied.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Workspace */}
      <Card className={`surface-card ${!teamSupport ? "opacity-60" : ""}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-400" />
            Create Team Workspace
            {!teamSupport && (
              <Badge
                variant="outline"
                className="ml-2 gap-1 border-amber-500/50 text-amber-500"
              >
                <Lock className="h-3 w-3" />
                Department+
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Create a new workspace to organize timetables for a specific
            department or committee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleCreateWorkspace}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input
                id="ws-name"
                placeholder="e.g. CS Department Scheduling"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                required
                disabled={!teamSupport}
              />
            </div>
            <Button
              type="submit"
              disabled={creating || !newWorkspaceName.trim() || !teamSupport}
              className="w-full sm:w-auto"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


