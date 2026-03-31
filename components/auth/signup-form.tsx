"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Chrome } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(true);

  useEffect(() => {
    void router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch("/api/auth/providers");
        const providers = (await response.json()) as Record<string, unknown>;
        setGoogleAvailable(Boolean(providers?.google));
      } catch {
        setGoogleAvailable(false);
      }
    };
    loadProviders();
  }, []);

  async function handleGoogleSignup() {
    if (!googleAvailable || pending) return;
    setPending(true);
    try {
      const callbackUrl =
        typeof window !== "undefined"
          ? new URL("/dashboard", window.location.origin).toString()
          : "/dashboard";
      await signIn("google", {
        redirect: true,
        callbackUrl,
      }, {
        prompt: "consent",
      });
      setPending(false);
    } catch {
      setPending(false);
      toast.error("Unable to start Google sign-up.");
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground text-center">
        Create your account instantly using your Google account. No passwords needed.
      </p>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full justify-center border-brand-border bg-background text-base transition-all duration-200 hover:scale-[1.02]"
        onClick={handleGoogleSignup}
        disabled={!googleAvailable || pending}
      >
        <Chrome className="mr-2 h-5 w-5" />
        {!googleAvailable
          ? "Google sign-up not configured"
          : pending
          ? "Redirecting..."
          : "Sign up with Google"}
      </Button>

      <div className="text-[11px] text-muted-foreground text-center leading-relaxed space-y-1">
        <p>
          By signing up, you agree to our{" "}
          <a href="/terms" className="text-secondary hover:underline">Terms of Service</a>{" "}
          and{" "}
          <a href="/privacy" className="text-secondary hover:underline">Privacy Policy</a>,
          including the no-refund policy.
        </p>
      </div>
    </div>
  );
}


