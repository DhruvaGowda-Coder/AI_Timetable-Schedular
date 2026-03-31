"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/auth/otp-input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function requestOtp() {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    setPending(true);
    const response = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      toast.error(data.message ?? "Failed to request OTP.");
      return;
    }
    toast.success("OTP requested.");
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const response = await fetch("/api/auth/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otp, newPassword }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      toast.error(data.message ?? "Unable to reset password.");
      return;
    }
    toast.success("Password reset successful. You can now sign in.");
  }

  return (
    <form className="space-y-4" onSubmit={resetPassword}>
      <div className="space-y-1">
        <Label htmlFor="forgot-email">Account email</Label>
        <Input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@institution.edu"
          required
        />
      </div>

      <Button type="button" variant="secondary" className="w-full" onClick={requestOtp}>
        Request OTP
      </Button>

      <div className="space-y-1">
        <Label>OTP</Label>
        <OtpInput value={otp} onChange={setOtp} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={8}
          placeholder="New secure password"
          required
        />
      </div>

      <Button className="h-11 w-full" disabled={pending}>
        {pending ? "Saving..." : "Reset Password"}
      </Button>
    </form>
  );
}


