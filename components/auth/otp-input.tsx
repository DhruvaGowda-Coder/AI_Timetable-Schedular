"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function OtpInput({ value, onChange, className }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit.trim()}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, "").slice(-1);
            const current = value.split("");
            current[idx] = next;
            onChange(current.join("").slice(0, 6));
            if (next && idx < 5) refs.current[idx + 1]?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[idx].trim() && idx > 0) {
              refs.current[idx - 1]?.focus();
            }
          }}
          className="h-11 w-11 rounded-md border border-input bg-background text-center text-base font-semibold shadow-sm transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      ))}
    </div>
  );
}


