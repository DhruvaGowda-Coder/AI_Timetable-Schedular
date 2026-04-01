import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  Mail,
  Phone,
  Sparkles,
  Zap,
  Shield,
  Clock,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SiteLogo } from "@/components/layout/site-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

const heroHighlights = [
  "Generate conflict-free timetables in minutes.",
  "Integrate with smart classrooms for live updates.",
  "Track utilization with real-time analytics.",
];

const featurePoints = [
  {
    title: "AI-Driven Timetable Generation",
    description:
      "Our advanced algorithms analyze constraints, faculty availability, and room capacities to generate conflict-free timetables in minutes, not days.",
    icon: Sparkles,
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    title: "Smart Classroom Integration",
    description:
      "Connect with IoT devices for automated attendance, digital board scheduling, and instant notifications to faculty and students.",
    icon: Building2,
    gradient: "from-violet-500 to-purple-400",
  },
  {
    title: "Real-Time Analytics & Insights",
    description:
      "Visualize faculty workload, room utilization, and time slots with interactive dashboards. Make data-driven decisions.",
    icon: BarChart3,
    gradient: "from-cyan-500 to-teal-400",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Set Constraints",
    description:
      "Define subjects, faculty availability, room capacity, and weekly slot timings from a single setup panel.",
    icon: Shield,
  },
  {
    step: "02",
    title: "Generate & Compare",
    description:
      "Create multiple AI timetable options, compare quality scores, and select the best-fit schedule for your campus.",
    icon: Zap,
  },
  {
    step: "03",
    title: "Publish & Manage",
    description:
      "Finalize the timetable, share updates with stakeholders, and monitor operations from your dashboard.",
    icon: Clock,
  },
];

const stats = [
  { value: "10K+", label: "Timetables Generated" },
  { value: "99.9%", label: "Uptime Guarantee" },
  { value: "50+", label: "Universities Trust Us" },
  { value: "< 2min", label: "Average Generation Time" },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="mesh-gradient" />

      {/* Extra floating orbs */}
      <div className="orb orb-blue" style={{ width: 500, height: 500, top: "-5%", left: "10%" }} />
      <div className="orb orb-purple" style={{ width: 400, height: 400, top: "40%", right: "-5%" }} />
      <div className="orb orb-cyan" style={{ width: 350, height: 350, bottom: "5%", left: "30%" }} />

      {/* ── HEADER ── */}
      <header className="glass-card sticky top-0 z-40 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex w-full max-w-content items-center justify-between px-4 py-4 lg:px-6">
          <SiteLogo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="outline" className="rounded-lg border-brand-border/50 bg-transparent backdrop-blur-sm">
              <Link href="/login" prefetch>
                Login
              </Link>
            </Button>
            <Button asChild className="btn-gradient rounded-lg px-5 py-2.5">
              <Link href="/signup" prefetch>
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="page-enter mx-auto w-full max-w-content space-y-20 px-4 py-16 lg:px-6">
        {/* ── HERO SECTION ── */}
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <ScrollReveal width="100%" className="space-y-6">
            <Badge className="rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-blue-400 hover:bg-blue-500/15">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              AI-Powered Scheduling
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight lg:text-6xl lg:leading-[1.1]">
              <span className="text-brand-text">Smart Timetable &</span>
              <br />
              <span className="gradient-text">Classroom Management</span>
              <br />
              <span className="text-brand-text">for Universities</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-brand-text-secondary">
              Eliminate clashes, optimize resources, and automate scheduling with our
              intelligent AI platform. Built for modern academic teams.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {heroHighlights.map((line) => (
                <p key={line} className="flex items-center gap-2.5 text-sm text-brand-text-secondary">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </span>
                  {line}
                </p>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button asChild size="lg" className="btn-gradient h-12 rounded-xl px-8 text-base">
                <Link href="/dashboard" prefetch>
                  Open Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild variant="outline" size="lg"
                className="h-12 rounded-xl border-brand-border/50 bg-transparent px-8 text-base backdrop-blur-sm btn-animated"
              >
                <Link href="/billing" prefetch>
                  View Plans
                </Link>
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal width="100%" delay={0.3}>
            <div className="glass-card glow-border overflow-hidden">
              <div className="border-b border-white/5 bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500 p-6">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <CalendarClock className="h-4 w-4" />
                  Intelligent University Operations
                </div>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Built for modern academic scheduling teams
                </h2>
              </div>
              <div className="space-y-4 p-6">
                {[
                  "Auto-resolve timetable clashes across departments and semesters.",
                  "Keep faculty, students, and admins aligned with instant updates.",
                  "Improve planning quality term-over-term with measurable insights.",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-3 text-sm text-brand-text-secondary">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    </span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── STATS BAR ── */}
        <ScrollReveal width="100%">
          <div className="glass-card grid grid-cols-2 divide-x divide-white/5 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="px-6 py-8 text-center">
                <p className="text-3xl font-bold gradient-text lg:text-4xl">{stat.value}</p>
                <p className="mt-1.5 text-sm text-brand-text-secondary">{stat.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* ── FEATURE CARDS ── */}
        <section className="grid gap-6 md:grid-cols-3">
          {featurePoints.map((item, index) => {
            const Icon = item.icon;
            return (
              <ScrollReveal key={item.title} width="100%" delay={0.15 + index * 0.1}>
                <div className="glass-card glow-border group h-full transition-all duration-500 hover:-translate-y-2 hover:shadow-card-hover">
                  <div className="p-7">
                    <span className={`mb-5 inline-flex rounded-xl bg-gradient-to-br ${item.gradient} p-3 text-white shadow-lg shadow-blue-500/20`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-brand-text">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-brand-text-secondary">
                      {item.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </section>

        {/* ── HOW IT WORKS ── */}
        <ScrollReveal width="100%" delay={0.2}>
          <section className="glass-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-7">
              <h3 className="text-2xl font-bold text-brand-text">How It Works</h3>
              <Badge className="rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-violet-400">
                3-Step Workflow
              </Badge>
            </div>
            <div className="grid gap-px bg-white/[0.02] md:grid-cols-3">
              {workflowSteps.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="group relative p-7 transition-colors duration-300 hover:bg-white/[0.03]"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-sm font-bold text-blue-400">
                        {item.step}
                      </span>
                      <Icon className="h-5 w-5 text-brand-muted transition-colors group-hover:text-blue-400" />
                    </div>
                    <p className="text-lg font-semibold text-brand-text">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-brand-text-secondary">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </ScrollReveal>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative border-t border-white/5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="mx-auto grid w-full max-w-content gap-6 px-4 py-10 text-sm lg:grid-cols-2 lg:px-6">
          <div>
            <SiteLogo className="px-0" />
            <p className="mt-2 max-w-sm text-brand-text-secondary">
              Intelligent timetable and classroom scheduling platform for universities.
              Powered by advanced AI algorithms.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-brand-text-secondary">
              <Link href="/terms" prefetch className="transition-colors hover:text-brand-text">
                Terms
              </Link>
              <Link href="/privacy" prefetch className="transition-colors hover:text-brand-text">
                Privacy
              </Link>
            </div>
          </div>
          <div>
            <p className="font-semibold text-brand-text">Support</p>
            <a
              href="mailto:dhruvagowda2006@gmail.com"
              className="mt-2 flex items-center gap-2 text-brand-text-secondary transition-colors hover:text-brand-text"
            >
              <Mail className="h-4 w-4 text-blue-400" />
              dhruvagowda2006@gmail.com
            </a>
            <p className="mt-1.5 flex items-center gap-2 text-brand-text-secondary transition-colors hover:text-brand-text">
              <Phone className="h-4 w-4 text-violet-400" />
              Phone / WhatsApp: +91 9686437883
            </p>
          </div>
        </div>
        <div className="border-t border-white/5 py-4 text-center text-xs text-brand-muted">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </div>
      </footer>
      <ScrollToTop />
    </div>
  );
}
