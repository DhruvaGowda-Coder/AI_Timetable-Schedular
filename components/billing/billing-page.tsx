"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  CreditCard,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { PRICING_TIERS } from "@/lib/constants";
import { RazorpayButton } from "@/components/billing/razorpay-button";
import type {
  BillingIntervalId,
  BillingSummary,
  PlanFeatures,
  PlanId,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { TermsDialog } from "@/components/legal/terms-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BILLING_CACHE_KEY = "schedulr.billing.cache.v3";
const BILLING_TERMS_ACK_KEY = "schedulr.billing.terms.accepted.v1";

const DEFAULT_FEATURES: PlanFeatures = {
  maxVariants: 3,
  adminSeats: 1,
  pdfExport: true,
  pdfWatermark: true,
  excelExport: false,
  aiExplanations: false,
  emergencyReschedule: false,
  analytics: false,
  versionHistory: false,
  googleCalendarSync: false,
  maxTemplates: 0,
  apiAccess: false,
  whiteLabel: false,
  onboardingWizard: false,
  historicalAnalytics: false,
  prioritySupport: false,
  conflictExplainer: false,
  facultyView: false,
  showAds: true,
  bulkGeneration: false,
};

function formatSubscriptionEnd(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "basic" || value === "premium";
}

const PLAN_RANK: Record<string, number> = {
  free: 0,
  pro: 1,
  department: 2,
  institution: 3,
};

export function BillingPage() {
  const { status } = useSession();
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [billingStatus, setBillingStatus] = useState("inactive");
  const [billingInterval, setBillingInterval] =
    useState<BillingIntervalId>("monthly");
  const [selectedInterval, setSelectedInterval] =
    useState<BillingIntervalId>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [canManagePaymentMethod, setCanManagePaymentMethod] = useState(false);
  const [supportResponseHours, setSupportResponseHours] = useState(24);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [features, setFeatures] = useState<PlanFeatures>(DEFAULT_FEATURES);
  const [acceptedCheckoutTerms, setAcceptedCheckoutTerms] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<"razorpay" | "lemonsqueezy">(() => {
    if (typeof window === "undefined") return "razorpay";
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz === "Asia/Calcutta" || tz === "Asia/Kolkata" ? "razorpay" : "lemonsqueezy";
  });

  const cards = useMemo(() => PRICING_TIERS, []);
  const currentTier = useMemo(
    () => cards.find((card) => card.id === currentPlan) ?? cards[0],
    [cards, currentPlan]
  );
  const formattedSubscriptionEnd = useMemo(
    () => formatSubscriptionEnd(subscriptionEnd),
    [subscriptionEnd]
  );

  const applyBillingSummary = useCallback((payload: BillingSummary) => {
    if (!isPlanId(payload.currentPlan)) return;

    const nextStatus =
      typeof payload.status === "string" ? payload.status : "inactive";
    const nextInterval = payload.billingInterval ?? "monthly";
    const nextCanManagePaymentMethod = Boolean(payload.canManagePaymentMethod);
    const nextSupportResponseHours = Number.isFinite(payload.supportResponseHours)
      ? Number(payload.supportResponseHours)
      : 24;

    setCurrentPlan(payload.currentPlan);
    setBillingStatus(nextStatus);
    setBillingInterval(nextInterval);
    setCanManagePaymentMethod(nextCanManagePaymentMethod);
    setSupportResponseHours(nextSupportResponseHours);
    setSubscriptionEnd(payload.subscriptionEnd ?? null);
    setFeatures(payload.features ?? DEFAULT_FEATURES);

    if (typeof window !== "undefined") {
      sessionStorage.setItem(BILLING_CACHE_KEY, JSON.stringify(payload));
    }
  }, []);

  const loadBilling = useCallback(async () => {
    try {
      const response = await fetch("/api/billing", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as BillingSummary | null;

      if (!response.ok || !payload) return;
      applyBillingSummary(payload);
    } catch (error) {
      console.error("Failed to load billing:", error);
    }
  }, [applyBillingSummary]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const accepted = sessionStorage.getItem(BILLING_TERMS_ACK_KEY) === "true";
    setAcceptedCheckoutTerms(accepted);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(BILLING_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as BillingSummary;
          applyBillingSummary(parsed);
        } catch {
          sessionStorage.removeItem(BILLING_CACHE_KEY);
        }
      }
    }

    void loadBilling();
  }, [applyBillingSummary, loadBilling]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentUrl = new URL(window.location.href);
    const checkoutState = currentUrl.searchParams.get("checkout");
    if (!checkoutState) return;

    if (checkoutState === "success") {
      toast.success("Checkout completed. Updating your billing status...");
      sessionStorage.removeItem(BILLING_CACHE_KEY);
      window.setTimeout(() => {
        void loadBilling();
      }, 1200);
    } else if (checkoutState === "cancelled") {
      toast.info("Checkout was cancelled.");
    }

    currentUrl.searchParams.delete("checkout");
    window.history.replaceState({}, "", currentUrl.toString());
  }, [loadBilling]);

  async function startCheckout(plan: "pro" | "department" | "institution") {
    if (status !== "authenticated") {
      toast.info("Please sign in to continue with subscription checkout.");
      await signIn(undefined, { callbackUrl: "/billing" });
      return;
    }
    if (!acceptedCheckoutTerms) {
      toast.error("Please read and accept the Terms before checkout.");
      setTermsDialogOpen(true);
      return;
    }

    setLoadingPlan(plan);
    try {
      const response = await fetch("/api/lemonsqueezy/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: selectedInterval }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; url?: string }
        | null;

      if (response.status === 503) {
        toast.info("Lemon Squeezy not configured. Using test mode upgrade...");
        const fallbackResponse = await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        if (fallbackResponse.ok) {
          sessionStorage.removeItem(BILLING_CACHE_KEY);
          window.location.href = "/billing?checkout=success";
          return;
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          toast.info("Please sign in to continue with subscription checkout.");
          await signIn(undefined, { callbackUrl: "/billing" });
          return;
        }
        toast.error(payload?.message ?? "Unable to start checkout.");
        return;
      }

      if (payload?.url) {
        window.location.href = payload.url;
        return;
      }

      toast.error("Lemon Squeezy did not return a checkout URL.");
    } catch (error) {
      console.error("Failed to start checkout:", error);
      toast.error("Unable to start checkout.");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function openBillingPortal() {
    if (status !== "authenticated") {
      toast.info("Please sign in to manage your payment method.");
      await signIn(undefined, { callbackUrl: "/billing" });
      return;
    }

    setPortalLoading(true);
    try {
      const response = await fetch("/api/lemonsqueezy/portal", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; url?: string }
        | null;

      if (!response.ok) {
        if (response.status === 401) {
          toast.info("Please sign in to manage your payment method.");
          await signIn(undefined, { callbackUrl: "/billing" });
          return;
        }
        toast.error(payload?.message ?? "Unable to open billing portal.");
        return;
      }

      if (payload?.url) {
        window.location.href = payload.url;
        return;
      }

      toast.error("Lemon Squeezy did not return a billing portal URL.");
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      toast.error("Unable to open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  function updateCheckoutTerms(accepted: boolean) {
    setAcceptedCheckoutTerms(accepted);
    if (typeof window !== "undefined") {
      if (accepted) {
        sessionStorage.setItem(BILLING_TERMS_ACK_KEY, "true");
      } else {
        sessionStorage.removeItem(BILLING_TERMS_ACK_KEY);
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        subtitle="Free by default, upgrade anytime. No free trial and no refunds on paid plans."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Current: {currentTier?.title ?? "Plan"}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">
              Status: {billingStatus}
            </Badge>
            {currentPlan !== "free" ? (
              <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">
                Cycle: {billingInterval}
              </Badge>
            ) : null}
            {canManagePaymentMethod ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openBillingPortal}
                disabled={portalLoading || loadingPlan !== null}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  "Manage Payment Method"
                )}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="surface-card border-secondary/25">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-secondary/12 p-2 text-secondary">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-brand-text-secondary">Current Plan</p>
              <p className="text-base font-semibold text-brand-text">
                {currentTier?.title ?? "Free"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-card border-secondary/25">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-secondary/12 p-2 text-secondary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-brand-text-secondary">Support SLA</p>
              <p className="text-base font-semibold text-brand-text">
                ~{supportResponseHours}h response target
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-card border-secondary/25">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-secondary/12 p-2 text-secondary">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-brand-text-secondary">Renewal</p>
              <p className="text-base font-semibold text-brand-text">
                {formattedSubscriptionEnd ?? "Not scheduled"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-card border-secondary/25">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-semibold text-brand-text">Billing interval</p>
            <p className="text-xs text-brand-text-secondary">
              Yearly plans include roughly 17% savings (12 months for the price of 10).
            </p>
          </div>
          <div className="inline-flex w-full sm:w-auto rounded-md border border-brand-border bg-card p-1">
            <Button
              type="button"
              size="sm"
              variant={selectedInterval === "monthly" ? "secondary" : "ghost"}
              className="h-8 flex-1 sm:flex-none"
              onClick={() => setSelectedInterval("monthly")}
            >
              Monthly
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedInterval === "yearly" ? "secondary" : "ghost"}
              className="h-8 flex-1 sm:flex-none"
              onClick={() => setSelectedInterval("yearly")}
            >
              Yearly
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Provider Toggle */}
      <Card className="surface-card border-secondary/25">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-semibold text-brand-text">Payment method</p>
            <p className="text-xs text-brand-text-secondary">
              Razorpay for India (₹) · Lemon Squeezy for international ($)
            </p>
          </div>
          <div className="inline-flex w-full sm:w-auto rounded-md border border-brand-border bg-card p-1">
            <Button
              type="button"
              size="sm"
              variant={paymentProvider === "razorpay" ? "secondary" : "ghost"}
              className="h-8 flex-1 sm:flex-none gap-1.5"
              onClick={() => setPaymentProvider("razorpay")}
            >
              🇮🇳 Pay in India (₹)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={paymentProvider === "lemonsqueezy" ? "secondary" : "ghost"}
              className="h-8 flex-1 sm:flex-none gap-1.5"
              onClick={() => setPaymentProvider("lemonsqueezy")}
            >
              💳 International ($)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((tier) => {
          const isCurrent = tier.id === currentPlan;
          const isPro = tier.id === "pro";
          const isUpgrade = PLAN_RANK[tier.id] > PLAN_RANK[currentPlan];
          const planButtonDisabled =
            loadingPlan !== null ||
            portalLoading ||
            isCurrent ||
            tier.id === "free";

          const activePriceObj =
            selectedInterval === "yearly"
              ? tier.yearlyPrice ?? tier.monthlyPrice
              : tier.monthlyPrice;
          const activePrice = paymentProvider === "razorpay"
            ? (activePriceObj.inr ?? activePriceObj.usd)
            : activePriceObj.usd;
          const activePriceForSavings = paymentProvider === "razorpay"
            ? activePriceObj.inr ?? activePriceObj.usd
            : activePriceObj.usd;

          const yearlyDisabled = selectedInterval === "yearly" && !tier.yearlyPrice;

          return (
            <Card
              key={tier.id}
              className={cn(
                "surface-card relative flex h-full flex-col overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                isCurrent && "border-secondary/45 shadow-md",
                isPro &&
                  "border-blue-500/50 bg-gradient-to-br from-card via-blue-50/55 to-blue-100/45 dark:border-blue-500/30 dark:via-blue-900/20 dark:to-blue-800/20"
              )}
            >
              <div className={cn("h-1 w-full bg-secondary/15", isCurrent && "bg-secondary/60")} />
              <CardHeader className="space-y-2 p-6">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xl text-brand-text">{tier.title}</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {tier.highlighted ? (
                      <Badge className="bg-secondary text-white hover:bg-secondary">
                        Popular
                      </Badge>
                    ) : null}
                    {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
                  </div>
                </div>
                <p className="text-sm text-brand-text-secondary">{tier.description}</p>
                <p className="text-xs text-brand-text-secondary">Best for: {tier.bestFor}</p>
                <div>
                  <p className="text-3xl font-bold text-brand-text">
                    {activePrice}
                    {tier.id !== "free" ? (
                      <span className="ml-1 text-sm font-medium text-muted-foreground">
                        /{selectedInterval === "yearly" ? "year" : "month"}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-brand-text-secondary">
                    {tier.id === "free" ? "Always free" : selectedInterval === "yearly" ? (
                      <span className="opacity-70 line-through">
                        {paymentProvider === "razorpay"
                          ? (tier.monthlyPrice.inr ?? tier.monthlyPrice.usd)
                          : tier.monthlyPrice.usd}/mo
                      </span>
                    ) : null}
                    {tier.id !== "free" && selectedInterval === "yearly" ? " (Save 20%)" : ""}
                    {tier.id !== "free" && selectedInterval === "monthly" ? "Billed monthly" : ""}
                  </p>
                  {paymentProvider === "razorpay" && tier.id !== "free" && (
                    <p className="mt-1 text-xs text-emerald-600 font-medium">Secured by Razorpay</p>
                  )}
                  {paymentProvider === "lemonsqueezy" && tier.id !== "free" && (
                    <p className="mt-1 text-xs text-brand-text-secondary">Secured by Lemon Squeezy</p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 p-6 pt-0">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm text-brand-text-secondary">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{feature}</span>
                  </div>
                ))}
                {yearlyDisabled ? (
                  <p className="text-xs text-amber-700">
                    Yearly billing is not available for this plan.
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="p-6 pt-0">
                {tier.id === "free" ? (
                  <Button className="w-full" variant="outline" disabled>
                    {isCurrent ? "Current free plan" : "Free plan"}
                  </Button>
                ) : paymentProvider === "razorpay" ? (
                  isCurrent ? (
                    <Button className="w-full" variant="outline" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <RazorpayButton
                      plan={tier.id as "pro" | "department" | "institution"}
                      interval={selectedInterval}
                      disabled={planButtonDisabled || yearlyDisabled}
                      acceptedTerms={acceptedCheckoutTerms}
                      onTermsRequired={() => setTermsDialogOpen(true)}
                      className={cn(
                        isPro && "bg-gradient-to-r from-brand-navy to-brand-steel text-white hover:opacity-90"
                      )}
                    >
                      {isUpgrade ? (
                        <><Crown className="mr-2 h-4 w-4" />Upgrade to {tier.title}</>
                      ) : (
                        <><Sparkles className="mr-2 h-4 w-4" />Switch to {tier.title}</>
                      )}
                    </RazorpayButton>
                  )
                ) : (
                  <Button
                    className={cn(
                      "w-full",
                      isPro &&
                        "bg-gradient-to-r from-brand-navy to-brand-steel text-white hover:opacity-90"
                    )}
                    variant={isPro ? "default" : "secondary"}
                    onClick={() => startCheckout(tier.id as "pro" | "department" | "institution")}
                    disabled={planButtonDisabled || yearlyDisabled}
                  >
                    {loadingPlan === tier.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : isCurrent ? (
                      "Current plan"
                    ) : isUpgrade ? (
                      <>
                        <Crown className="mr-2 h-4 w-4" />
                        Upgrade to {tier.title}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Switch to {tier.title}
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Card className="surface-card border-secondary/25">
        <CardContent className="space-y-2 p-4 text-sm text-brand-text-secondary">
          <p>
            Policy: No refunds on paid subscriptions. No free trial. You start on Free and
            can upgrade any time.
          </p>
          <div className="rounded-md border border-brand-border bg-secondary/5 p-3">
            <label htmlFor="billing-terms" className="flex items-start gap-2 text-xs">
              <Checkbox
                id="billing-terms"
                checked={acceptedCheckoutTerms}
                onCheckedChange={(checked) => updateCheckoutTerms(checked === true)}
                className="mt-0.5"
              />
              <span>
                I have read and accept the Terms and Conditions (including no-refund policy) to
                continue checkout.
              </span>
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3 pl-6 text-xs">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-secondary"
                onClick={() => setTermsDialogOpen(true)}
              >
                Read Terms
              </Button>
              <Link href="/terms" prefetch className="font-medium text-secondary hover:underline">
                Open full page
              </Link>
            </div>
          </div>
          <p>
            Need details? Review the{" "}
            <Link href="/terms" prefetch className="font-medium text-secondary hover:underline">
              Terms page
            </Link>
            .
          </p>
          <p>
            Current ads status: {features.showAds ? "Ads enabled (Free tier)" : "Ad-free"}.
            {" "}Payment method: {paymentProvider === "razorpay" ? "Razorpay (₹ INR)" : "Lemon Squeezy ($ USD)"}.
          </p>
        </CardContent>
      </Card>

      <TermsDialog
        open={termsDialogOpen}
        onOpenChange={setTermsDialogOpen}
        onAccept={() => updateCheckoutTerms(true)}
        acceptLabel="Accept Terms and continue"
      />
    </div>
  );
}


