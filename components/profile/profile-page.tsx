"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  Clock3,
  Code2,
  Copy,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import type { PlanId, UserProfile, PlanFeatures } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceSettings } from "./workspace-settings";
import { BrandingSettings } from "./branding-settings";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfilePreferences {
  emailAlerts: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
}

interface StoredProfileState {
  profile?: Partial<UserProfile>;
  preferences?: Partial<ProfilePreferences>;
}

interface ApiKeySummary {
  plan: PlanId;
  canUseApi: boolean;
  hasApiKey: boolean;
  keyPrefix: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
}

const PROFILE_STORAGE_KEY = "schedulr.profile.v1";

const EMPTY_PROFILE: UserProfile = {
  fullName: "",
  email: "",
  role: "",
  organization: "",
  timezone: "",
};

const EMPTY_API_SUMMARY: ApiKeySummary = {
  plan: "free",
  canUseApi: false,
  hasApiKey: false,
  keyPrefix: null,
  createdAt: null,
  lastUsedAt: null,
};

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

export function ProfilePage() {
  const { status } = useSession();
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [preferences, setPreferences] = useState<ProfilePreferences>({
    emailAlerts: false,
    productUpdates: false,
    weeklyDigest: false,
  });
  const [saving, setSaving] = useState(false);

  const [billingFeatures, setBillingFeatures] = useState<PlanFeatures | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  const [apiSummary, setApiSummary] = useState<ApiKeySummary>(EMPTY_API_SUMMARY);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiAction, setApiAction] = useState<"generate" | "revoke" | null>(null);
  const [visibleApiKey, setVisibleApiKey] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as StoredProfileState;
      if (parsed.profile && typeof parsed.profile === "object") {
        setProfile({
          fullName: typeof parsed.profile.fullName === "string" ? parsed.profile.fullName : "",
          email: typeof parsed.profile.email === "string" ? parsed.profile.email : "",
          role: typeof parsed.profile.role === "string" ? parsed.profile.role : "",
          organization:
            typeof parsed.profile.organization === "string" ? parsed.profile.organization : "",
          timezone: typeof parsed.profile.timezone === "string" ? parsed.profile.timezone : "",
        });
      }
      if (parsed.preferences && typeof parsed.preferences === "object") {
        setPreferences({
          emailAlerts: Boolean(parsed.preferences.emailAlerts),
          productUpdates: Boolean(parsed.preferences.productUpdates),
          weeklyDigest: Boolean(parsed.preferences.weeklyDigest),
        });
      }
    } catch {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    }
  }, []);

  async function fetchApiSummary() {
    if (status !== "authenticated") {
      setApiSummary(EMPTY_API_SUMMARY);
      return;
    }

    setApiLoading(true);
    try {
      const response = await fetch("/api/profile/api-key", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | (ApiKeySummary & { message?: string })
        | null;

      if (!response.ok) {
        if (response.status === 401) {
          setApiSummary(EMPTY_API_SUMMARY);
          return;
        }
        toast.error(payload?.message ?? "Unable to load API key settings.");
        return;
      }

      setApiSummary({
        plan: payload?.plan === "institution" ? payload.plan : "free",
        canUseApi: Boolean(payload?.canUseApi),
        hasApiKey: Boolean(payload?.hasApiKey),
        keyPrefix: payload?.keyPrefix ?? null,
        createdAt: payload?.createdAt ?? null,
        lastUsedAt: payload?.lastUsedAt ?? null,
      });
    } catch {
      toast.error("Unable to load API key settings.");
    } finally {
      setApiLoading(false);
    }
  }

  useEffect(() => {
    void fetchApiSummary();
    
    async function loadBilling() {
      if (status !== "authenticated") {
        setBillingLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/billing", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          if (payload.features) setBillingFeatures(payload.features);
        }
      } catch (e) {
        console.error("Failed to load billing features", e);
      } finally {
        setBillingLoading(false);
      }
    }
    loadBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const initials = useMemo(() => {
    const words = profile.fullName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "-";
    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
  }, [profile.fullName]);

  function update<K extends keyof typeof profile>(key: K, value: (typeof profile)[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile() {
    setSaving(true);
    try {
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({
          profile,
          preferences,
          savedAt: new Date().toISOString(),
        })
      );
      toast.success("Profile saved.");
    } catch {
      toast.error("Unable to save profile in browser storage.");
    } finally {
      setSaving(false);
    }
  }

  async function generateOrRotateApiKey() {
    if (status !== "authenticated") {
      await signIn(undefined, { callbackUrl: "/profile" });
      return;
    }

    setApiAction("generate");
    try {
      const response = await fetch("/api/profile/api-key", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; apiKey?: string; keyPrefix?: string }
        | null;

      if (!response.ok) {
        if (response.status === 401) {
          await signIn(undefined, { callbackUrl: "/profile" });
          return;
        }
        toast.error(payload?.message ?? "Unable to generate API key.");
        return;
      }

      if (!payload?.apiKey) {
        toast.error("API key was not returned. Try again.");
        return;
      }

      setVisibleApiKey(payload.apiKey);
      setApiSummary((prev) => ({
        ...prev,
        plan: "institution",
        canUseApi: true,
        hasApiKey: true,
        keyPrefix: payload.keyPrefix ?? prev.keyPrefix,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      }));
      toast.success("API key generated. Copy it now and store it securely.");
    } catch {
      toast.error("Unable to generate API key.");
    } finally {
      setApiAction(null);
    }
  }

  async function revokeApiKey() {
    if (status !== "authenticated") {
      await signIn(undefined, { callbackUrl: "/profile" });
      return;
    }

    setApiAction("revoke");
    try {
      const response = await fetch("/api/profile/api-key", { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        toast.error(payload?.message ?? "Unable to revoke API key.");
        return;
      }

      setVisibleApiKey(null);
      setApiSummary((prev) => ({
        ...prev,
        hasApiKey: false,
        keyPrefix: null,
        createdAt: null,
        lastUsedAt: null,
      }));
      toast.success("API key revoked.");
    } catch {
      toast.error("Unable to revoke API key.");
    } finally {
      setApiAction(null);
    }
  }

  async function copyVisibleApiKey() {
    if (!visibleApiKey) {
      toast.info("Generate or rotate your API key first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(visibleApiKey);
      toast.success("API key copied.");
    } catch {
      toast.error("Unable to copy API key.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Manage account details, organization settings, notification preferences, and API access."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {status === "authenticated" ? (
              <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            ) : (
              <Button variant="outline" onClick={() => signIn(undefined, { callbackUrl: "/profile" })}>
                <LogIn className="mr-2 h-4 w-4" />
                Log in
              </Button>
            )}
            <Button onClick={saveProfile} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="surface-card lg:col-span-1">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15 text-sm font-semibold text-secondary">
                {initials}
              </div>
              <div>
                <p className="text-base font-semibold text-brand-text">{profile.fullName || "Not set"}</p>
                <p className="text-sm text-brand-text-secondary">{profile.role || "Not set"}</p>
              </div>
            </div>
            <div className="space-y-2 rounded-md border border-brand-border/80 bg-card p-3">
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <Mail className="h-4 w-4 text-secondary" />
                <span>{profile.email || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <Building2 className="h-4 w-4 text-secondary" />
                <span>{profile.organization || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-text">
                <Clock3 className="h-4 w-4 text-secondary" />
                <span>{profile.timezone || "Not set"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCircle2 className="h-4 w-4 text-secondary" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={profile.fullName}
                placeholder="Enter full name"
                onChange={(event) => update("fullName", event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profile.email}
                placeholder="Enter email address"
                onChange={(event) => update("email", event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-role">Role</Label>
              <Input
                id="profile-role"
                value={profile.role}
                placeholder="Enter your role"
                onChange={(event) => update("role", event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-org">Organization</Label>
              <Input
                id="profile-org"
                value={profile.organization}
                placeholder="Enter organization name"
                onChange={(event) => update("organization", event.target.value)}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="profile-timezone">Timezone</Label>
              <Input
                id="profile-timezone"
                value={profile.timezone}
                placeholder="Enter timezone (e.g. Asia/Kolkata)"
                onChange={(event) => update("timezone", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-4 w-4 text-secondary" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span className="text-brand-text">Email alerts for scheduling changes</span>
              <Checkbox
                checked={preferences.emailAlerts}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, emailAlerts: Boolean(checked) }))
                }
              />
            </label>
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span className="text-brand-text">Product updates and release notes</span>
              <Checkbox
                checked={preferences.productUpdates}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, productUpdates: Boolean(checked) }))
                }
              />
            </label>
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span className="text-brand-text">Weekly usage summary</span>
              <Checkbox
                checked={preferences.weeklyDigest}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, weeklyDigest: Boolean(checked) }))
                }
              />
            </label>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-4 w-4 text-secondary" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium text-brand-text">Session Protection</p>
              <p className="text-xs text-brand-text-secondary">
                Sign in is required only for subscription and payment actions.
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium text-brand-text">Last Profile Update</p>
              <p className="text-xs text-brand-text-secondary">
                Updates are saved to your account workspace settings.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Security Preferences"}
            </Button>
            {status === "authenticated" ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => signIn(undefined, { callbackUrl: "/profile" })}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Log in
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspaceSettings 
          features={billingFeatures as PlanFeatures} 
          isLoading={billingLoading} 
        />
        <BrandingSettings 
          features={billingFeatures as PlanFeatures} 
          isLoading={billingLoading} 
        />
      </div>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Code2 className="h-4 w-4 text-secondary" />
            Developer API (Institution)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status !== "authenticated" ? (
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium text-brand-text">Sign in required</p>
              <p className="mt-1 text-xs text-brand-text-secondary">
                Log in to manage your API key from profile.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => signIn(undefined, { callbackUrl: "/profile" })}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Log in
              </Button>
            </div>
          ) : apiLoading ? (
            <div className="rounded-md border p-3 text-sm text-brand-text-secondary">
              Loading API key settings...
            </div>
          ) : !apiSummary.canUseApi ? (
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium text-brand-text">Institution required</p>
              <p className="mt-1 text-xs text-brand-text-secondary">
                API key access is available only on Institution plan. Current plan:{" "}
                <span className="font-medium uppercase">{apiSummary.plan}</span>.
              </p>
              <Button asChild variant="outline" className="mt-3">
                <Link href="/billing" prefetch>
                  Upgrade to Institution
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium text-brand-text">API Key Status</p>
                <p className="mt-1 text-xs text-brand-text-secondary">
                  {apiSummary.hasApiKey
                    ? `Active key prefix: ${apiSummary.keyPrefix ?? "N/A"}`
                    : "No API key generated yet."}
                </p>
                <p className="mt-1 text-xs text-brand-text-secondary">
                  Created: {formatDateTime(apiSummary.createdAt)}
                </p>
                <p className="text-xs text-brand-text-secondary">
                  Last used: {formatDateTime(apiSummary.lastUsedAt)}
                </p>
              </div>

              {visibleApiKey ? (
                <div className="rounded-md border border-secondary/30 bg-secondary/5 p-3">
                  <Label htmlFor="visible-api-key">Your API key (shown once)</Label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Input id="visible-api-key" readOnly value={visibleApiKey} className="font-mono text-xs" />
                    <Button type="button" variant="outline" onClick={copyVisibleApiKey}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-brand-text-secondary">
                    Store this key securely. For security, full key is not shown again after refresh.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={generateOrRotateApiKey} disabled={apiAction !== null}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  {apiAction === "generate"
                    ? "Generating..."
                    : apiSummary.hasApiKey
                    ? "Rotate API Key"
                    : "Generate API Key"}
                </Button>
                <Button
                  variant="outline"
                  onClick={revokeApiKey}
                  disabled={apiAction !== null || !apiSummary.hasApiKey}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {apiAction === "revoke" ? "Revoking..." : "Revoke Key"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setVisibleApiKey(null);
                    void fetchApiSummary();
                  }}
                  disabled={apiAction !== null}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-sm font-medium text-brand-text">Usage</p>
                <p className="mt-1 text-xs text-brand-text-secondary">
                  Use your API key in the <code>x-api-key</code> header with{" "}
                  <code>/api/scheduler/generate</code>.
                </p>
                <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-[11px] text-slate-100">
{`curl -X POST https://your-domain.com/api/scheduler/generate \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"constraints": {...}, "count": 3}'`}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


