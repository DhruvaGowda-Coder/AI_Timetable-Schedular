"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Chrome } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Google sign-in could not be started.",
  OAuthCallback:
    "Google sign-in callback failed. Open the app with the same host/port shown in your browser URL.",
  OAuthCreateAccount: "Unable to create account from Google profile.",
  OAuthAccountNotLinked:
    "This email is already used with another sign-in method. Sign in with that method first.",
  Callback: "Authentication callback failed.",
  AccessDenied: "Access was denied during sign-in.",
  Verification: "Verification failed. Please retry sign-in.",
  Default: "Sign-in failed. Please try again.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const shownErrorRef = useRef<string | null>(null);
  const [googleAvailable, setGoogleAvailable] = useState(true);
  const [pending, setPending] = useState(false);
  const authError = searchParams.get("error");
  const authErrorMessage = useMemo(() => {
    if (!authError) return "";
    return AUTH_ERROR_MESSAGES[authError] ?? AUTH_ERROR_MESSAGES.Default;
  }, [authError]);

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

  useEffect(() => {
    void router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  useEffect(() => {
    if (!authError || shownErrorRef.current === authError) return;
    shownErrorRef.current = authError;
    toast.error(authErrorMessage);
  }, [authError, authErrorMessage]);

  async function handleGoogleLogin() {
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
      toast.error("Unable to start Google login.");
    }
  }

  return (
    <div className="space-y-5">
      {authError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {authErrorMessage}
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground text-center">
        Use your institutional or personal Google account to get started instantly.
      </p>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full justify-center border-brand-border bg-background text-base transition-all duration-200 hover:scale-[1.02]"
        onClick={handleGoogleLogin}
        disabled={!googleAvailable || pending}
      >
        <Chrome className="mr-2 h-5 w-5" />
        {!googleAvailable
          ? "Google login not configured"
          : pending
          ? "Redirecting..."
          : "Continue with Google"}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        By signing in, you agree to our{" "}
        <a href="/terms" className="text-secondary hover:underline">Terms of Service</a>{" "}
        and{" "}
        <a href="/privacy" className="text-secondary hover:underline">Privacy Policy</a>.
      </p>
    </div>
  );
}


