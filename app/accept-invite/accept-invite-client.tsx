"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AcceptInviteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Accepting your invitation...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No invitation token found in the URL.");
      return;
    }

    let isMounted = true;
    async function accept() {
      try {
        const res = await fetch("/api/workspaces/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json().catch(() => null);

        if (!isMounted) return;

        if (res.ok) {
          setStatus("success");
          setMessage("You have successfully joined the workspace!");
          toast.success("Joined Workspace successfully.");
          
          // Switch to this workspace by setting a cookie, then redirecting
          if (data?.workspaceId) {
            document.cookie = `schedulr_workspace_id=${data.workspaceId}; path=/; max-age=31536000; SameSite=Lax`;
          }
          
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 2000);
        } else {
          // If returning 401 unauthorized, typical nextauth redirect doesn't auto-redirect from API
          if (res.status === 401) {
            setStatus("error");
            setMessage("You need to be logged in to accept an invitation. Please log in and click the link again.");
            return;
          }
          setStatus("error");
          setMessage(data?.message || "Failed to accept the invitation.");
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus("error");
        setMessage("An unexpected error occurred while accepting the invitation.");
      }
    }

    accept();
    return () => { isMounted = false; };
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Background mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb-blue" />
        <div className="orb-purple" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="surface-card border-brand-border/50">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            {status === "loading" && (
              <>
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-purple-400" />
                <h2 className="text-xl font-bold text-brand-text text-glow">Joining Workspace</h2>
                <p className="mt-2 text-sm text-brand-text-secondary">{message}</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-brand-text">Success!</h2>
                <p className="mt-2 text-sm text-brand-text-secondary">{message}</p>
                <p className="mt-4 text-xs text-brand-text-secondary">Redirecting you to dashboard...</p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-brand-text">Invitation Error</h2>
                <p className="mt-2 text-sm text-brand-text-secondary">{message}</p>
                <div className="mt-6 flex w-full flex-col gap-2">
                  <Button 
                    variant={message.includes("log in") ? "default" : "outline"} 
                    className="w-full"
                    onClick={() => {
                      if (message.includes("log in")) router.push("/login?callbackUrl=" + encodeURIComponent(window.location.href));
                      else router.push("/dashboard");
                    }}
                  >
                    {message.includes("log in") ? "Go to Login" : "Return to Dashboard"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}


