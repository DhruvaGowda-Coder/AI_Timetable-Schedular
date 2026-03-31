"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlanId, BillingIntervalId } from "@/lib/types";

interface RazorpayButtonProps {
  plan: Exclude<PlanId, "free">;
  interval: BillingIntervalId;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  acceptedTerms: boolean;
  onTermsRequired: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function RazorpayButton({
  plan,
  interval,
  disabled,
  className,
  children,
  acceptedTerms,
  onTermsRequired,
}: RazorpayButtonProps) {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (status !== "authenticated") {
      toast.info("Please sign in to continue.");
      await signIn(undefined, { callbackUrl: "/billing" });
      return;
    }

    if (!acceptedTerms) {
      toast.error("Please accept the Terms before checkout.");
      onTermsRequired();
      return;
    }

    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load Razorpay. Check your internet connection.");
        return;
      }

      const res = await fetch("/api/razorpay/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 503) {
          toast.error("Razorpay is not configured on this server.");
        } else {
          toast.error(data?.message ?? "Failed to start checkout.");
        }
        return;
      }

      const { subscriptionId, keyId, userName, userEmail } = data;

      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: "SlotIQ",
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — ${interval}`,
        image: "/logo.png",
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, plan, interval }),
            });

            if (verifyRes.ok) {
              toast.success("Subscription activated! Welcome to " + plan + ".");
              sessionStorage.removeItem("schedulr.billing.cache.v3");
              router.refresh();
              window.location.href = "/billing?checkout=success";
            } else {
              const errData = await verifyRes.json().catch(() => null);
              toast.error(errData?.message ?? "Payment verification failed. Contact support.");
            }
          } catch {
            toast.error("Payment verification error. Contact support.");
          }
        },
        prefill: {
          name: userName ?? "",
          email: userEmail ?? "",
        },
        theme: { color: "#185FA5" },
        modal: {
          ondismiss: () => {
            toast.info("Checkout cancelled.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Razorpay checkout error:", error);
      toast.error("Unable to start checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      className={cn("w-full", className)}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Opening...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
