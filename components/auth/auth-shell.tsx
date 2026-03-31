import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteLogo } from "@/components/layout/site-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface AuthShellProps {
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, footer, children }: AuthShellProps) {
  return (
    <div className="page-enter relative flex min-h-screen items-center justify-center p-4">
      {/* Animated background orbs */}
      <div className="mesh-gradient" />
      <div className="orb orb-blue" style={{ width: 450, height: 450, top: "5%", left: "15%" }} />
      <div className="orb orb-purple" style={{ width: 350, height: 350, bottom: "10%", right: "10%" }} />
      <div className="orb orb-cyan" style={{ width: 250, height: 250, top: "50%", left: "60%" }} />

      <div className="relative w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <SiteLogo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-text-secondary transition-colors hover:bg-white/5 hover:text-brand-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>

        <div className="glass-card glow-border animate-surface-enter overflow-hidden">
          {/* Gradient accent line at top */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500" />
          <CardHeader className="space-y-2 px-6 pt-7 pb-2">
            <h1 className="text-2xl font-bold tracking-tight text-brand-text">{title}</h1>
            <p className="text-sm text-brand-text-secondary">{subtitle}</p>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-7">{children}</CardContent>
        </div>
        {footer ? (
          <div className="text-center text-sm text-brand-text-secondary">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}


