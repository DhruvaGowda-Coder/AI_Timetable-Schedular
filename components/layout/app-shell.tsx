"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut, UserCircle2 } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { APP_NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SiteLogo } from "@/components/layout/site-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

interface AppShellProps {
  children: React.ReactNode;
}

const ADS_CACHE_KEY = "schedulr.ads.cache.v1";
const ADS_CACHE_TTL_MS = 5 * 60 * 1000;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { data: session } = useSession();
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const routeKey = pathname ?? "route";
  const routeTransitionPending = pendingRoute !== null && pendingRoute !== pathname;

  const resetBodyInteractionLocks = useCallback(() => {
    if (typeof document === "undefined") return;
    const hasOpenDialog = Boolean(document.querySelector('[role="dialog"][data-state="open"]'));
    if (hasOpenDialog) return;
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("pointer-events");
    document.body.style.removeProperty("padding-right");
  }, []);

  useEffect(() => {
    setPendingRoute(null);
  }, [pathname]);

  useEffect(() => {
    resetBodyInteractionLocks();
  }, [pathname, resetBodyInteractionLocks]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const onVisibilityOrFocus = () => resetBodyInteractionLocks();
    const onPointerDownCapture = () => resetBodyInteractionLocks();

    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    document.addEventListener("pointerdown", onPointerDownCapture, true);

    return () => {
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
    };
  }, [resetBodyInteractionLocks]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      APP_NAV_ITEMS.forEach((item) => {
        void router.prefetch(item.href);
      });
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const userId = session?.user?.id ?? "";
    const cacheKey = userId ? `${ADS_CACHE_KEY}:${userId}` : "";

    const loadBillingFeatures = async () => {
      if (!userId) {
        if (!cancelled) setAdsEnabled(false);
        return;
      }

      if (typeof window !== "undefined") {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as {
              showAds?: boolean;
              cachedAt?: number;
            };
            if (
              Number.isFinite(parsed.cachedAt) &&
              Date.now() - Number(parsed.cachedAt) < ADS_CACHE_TTL_MS
            ) {
              if (!cancelled) setAdsEnabled(Boolean(parsed.showAds));
              return;
            }
          } catch {
            sessionStorage.removeItem(cacheKey);
          }
        }
      }

      try {
        const response = await fetch("/api/billing");
        if (!response.ok) return;
        const payload = (await response.json()) as {
          features?: { showAds?: boolean };
        };
        if (!cancelled) {
          const nextAdsEnabled = Boolean(payload.features?.showAds);
          setAdsEnabled(nextAdsEnabled);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({
                showAds: nextAdsEnabled,
                cachedAt: Date.now(),
              })
            );
          }
        }
      } catch {
        if (!cancelled) setAdsEnabled(false);
      }
    };

    void loadBillingFeatures();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Check onboarding status
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    let cancelled = false;

    const checkOnboarding = async () => {
      try {
        const response = await fetch("/api/onboarding");
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data.onboardingCompleted === false) {
          setShowOnboarding(true);
        }
      } catch {
        // Silently ignore — don't block the app
      }
    };

    checkOnboarding();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const handleRouteIntent = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }

      if (href === pathname) {
        setPendingRoute(null);
        return;
      }

      setPendingRoute(href);
    },
    [pathname]
  );

  return (
    <div className="relative min-h-screen">
      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Subtle background mesh */}
      <div className="mesh-gradient" />

      {/* ── GLASSMORPHISM HEADER ── */}
      <header className="glass-card sticky top-0 z-30 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex w-full max-w-content items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 lg:px-6">
          <div className="min-w-0 shrink">
            <SiteLogo />
          </div>

          {/* Desktop nav with animated pill */}
          <nav className="hidden items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 backdrop-blur-sm md:flex">
            {APP_NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={(event) => handleRouteIntent(event, item.href)}
                  className={cn(
                    "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-300",
                    active
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground",
                    pendingRoute === item.href && "opacity-70"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600"
                      style={{ zIndex: -1 }}
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.5,
                      }}
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {session?.user && <WorkspaceSwitcher />}
            <ThemeToggle />
            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex h-10 shrink-0 items-center justify-center rounded-full border-white/10 bg-white/5 px-2 backdrop-blur-sm transition-all hover:bg-white/10 hover:shadow-glow-sm"
                  >
                    <span className="relative flex shrink-0 items-center justify-center">
                      <Avatar className="h-7 w-7 ring-2 ring-blue-500/30">
                        <AvatarImage src={session.user.image ?? ""} alt={session.user.name ?? ""} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-600 text-xs text-white">
                          {(session.user.name?.charAt(0) ?? "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </span>
                    <span className="hidden text-sm sm:ml-2 sm:inline">{session.user.name ?? "Profile"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card w-52 border-white/10">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Signed in as {session.user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" prefetch className="cursor-pointer">
                      <UserCircle2 className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => signIn()} className="btn-gradient rounded-lg px-3 text-sm sm:px-5">
                Login
              </Button>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="thin-scrollbar flex gap-1 overflow-x-auto border-t border-white/5 bg-white/[0.02] px-4 py-2 backdrop-blur-sm md:hidden">
          {APP_NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={(event) => handleRouteIntent(event, item.href)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white"
                    : "text-muted-foreground hover:bg-white/5",
                  pendingRoute === item.href && "opacity-70"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {adsEnabled ? (
          <div className="border-t border-amber-500/20 bg-amber-500/5 px-4 py-2 text-center text-xs text-amber-300 backdrop-blur-sm">
            Sponsored: Upgrade to Pro or above for an ad-free workspace.
          </div>
        ) : null}
      </header>

      {/* ── MAIN CONTENT ── */}
      <main
        className="mx-auto w-full max-w-content px-4 py-6 lg:px-6 lg:py-8"
        aria-busy={routeTransitionPending}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={routeKey}
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12, filter: prefersReducedMotion ? "none" : "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8, filter: prefersReducedMotion ? "none" : "blur(4px)" }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}


