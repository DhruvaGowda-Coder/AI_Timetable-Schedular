import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
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
  HelpCircle,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteLogo } from "@/components/layout/site-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

export const metadata: Metadata = {
  title: "AI Timetable Management Software for Educational Institutions | TimetabiQ",
  description: "Automate academic scheduling with AI-powered timetable management software. Designed for schools, colleges, and universities to eliminate conflicts.",
  alternates: {
    canonical: "https://timetabiq.com/"
  }
};

const heroHighlights = [
  "Solve manual scheduling conflicts effortlessly.",
  "Optimize college timetable system capacities automatically.",
  "Scalable AI scheduling software for any institution.",
];

const featurePoints = [
  {
    title: "AI-Driven Timetable Generation",
    description:
      "Our AI timetable management software analyzes constraints, faculty availability, and room capacities to generate conflict-free schedules instantly.",
    icon: Sparkles,
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    title: "Smart Classroom Scheduling System",
    description:
      "A complete university scheduling software that prevents double-booking, manages resources, and scales perfectly for colleges and universities.",
    icon: Building2,
    gradient: "from-violet-500 to-purple-400",
  },
  {
    title: "Conflict Resolution & Analytics",
    description:
      "Visualize faculty workload and room utilization. Our college timetable system provides actionable insights to optimize institutional resources.",
    icon: BarChart3,
    gradient: "from-cyan-500 to-teal-400",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Set Your Constraints",
    description:
      "Define subjects, faculty availability, and room capacities. Say goodbye to manual scheduling inefficiencies.",
    icon: Shield,
  },
  {
    step: "02",
    title: "AI Automated Scheduling",
    description:
      "Let AI scheduling software handle complex variables to generate conflict-free options tailored to your school or university.",
    icon: Zap,
  },
  {
    step: "03",
    title: "Publish & Manage",
    description:
      "Approve the optimal schedule, share with faculty and students, and request a demo to see resource management made easy.",
    icon: Clock,
  },
];

const stats = [
  { value: "10K+", label: "Timetables Generated" },
  { value: "100%", label: "Conflict-Free Schedules" },
  { value: "50+", label: "Schools & Colleges Trust Us" },
  { value: "< 2min", label: "Average Generation Time" },
];

const faqs = [
  {
    question: "What is timetable management software?",
    answer: "It is a digital solution that helps educational institutions plan and organize classes, manage faculty loads, and allocate rooms without conflicts."
  },
  {
    question: "How does AI scheduling work?",
    answer: "AI scheduling algorithms analyze complex constraints like teacher availability, room sizes, and course requirements to automatically generate an optimal, clash-free timetable."
  },
  {
    question: "What are benefits of automated timetables?",
    answer: "Automated timetables save countless hours of manual work, completely eliminate scheduling conflicts, and optimize resource and classroom utilization."
  },
  {
    question: "Who can use this system?",
    answer: "This system is designed specifically for academic administrators, department heads, and scheduling staff at K-12 schools, colleges, and higher education universities."
  },
  {
    question: "Can this scale for universities?",
    answer: "Yes, our university scheduling software seamlessly handles thousands of concurrent sessions, hundreds of faculty members, and massive, multi-campus infrastructure deployments natively."
  }
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "TimetabiQ",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "description": "AI timetable management software specifically designed for schools, colleges, and universities."
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
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
              <Link href="/dashboard" prefetch>
                Dashboard
              </Link>
            </Button>
            <Button asChild className="btn-gradient rounded-lg px-5 py-2.5">
              <Link href="/scheduler" prefetch>
                Scheduler
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
              Designed for modern educational institutions
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight lg:text-5xl border-l-4 border-blue-500 pl-4">
              <span className="text-brand-text">AI Timetable</span>
              <br />
              <span className="gradient-text">Management Software</span>
              <br />
              <span className="text-brand-text text-[0.8em]">for Schools, Colleges & Universities</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-brand-text-secondary pr-4">
              Achieve total academic scheduling automation. Replace manual inefficiencies and cascading conflicts with our industry-leading AI-based automated timetable generation tool perfectly tailored to optimize your facility's resources.
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

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button asChild size="lg" className="btn-gradient h-12 rounded-xl px-8 text-base shadow-xl shadow-blue-500/20">
                <Link href="/dashboard" prefetch>
                  Open Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-8 text-base border-white/20 hover:bg-white/5">
                <Link href="/scheduler" prefetch>
                  Try Scheduler
                </Link>
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal width="100%" delay={0.3}>
            <div className="glass-card glow-border overflow-hidden rounded-[2rem]">
              <div className="border-b border-white/5 bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500 p-8 shadow-inner shadow-black/20">
                <div className="flex items-center gap-2 text-sm text-white/80 uppercase tracking-wider font-semibold">
                  <CalendarClock className="h-4 w-4" />
                  Intelligent Educational Scheduling
                </div>
                <h2 className="mt-3 text-2xl font-bold text-white leading-tight">
                  The robust foundation for academic scheduling teams
                </h2>
              </div>
              <div className="space-y-4 p-8 bg-black/40">
                {[
                  "Eliminate manual scheduling inefficiencies completely.",
                  "Resolve timetable conflicts automatically globally.",
                  "Improve physical classroom utilization natively.",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-4 text-brand-text-secondary">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </span>
                    <span className="text-lg leading-snug">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── SEO CONTENT SECTION ── */}
        <ScrollReveal width="100%">
          <section className="glass-card p-10 lg:p-14 rounded-3xl border border-white/10 mt-10 space-y-8 bg-gradient-to-br from-black/40 via-transparent to-black/40">
            <h2 className="text-3xl font-bold text-brand-text">Why Educational Institutions Need Advanced AI Timetable Management</h2>
            <div className="prose prose-invert prose-lg max-w-none text-brand-text-secondary space-y-6">
              <p>
                In today's fast-paced educational infrastructure, strict manual scheduling has become actively detrimental. Generating mathematically sound, conflict-free schedules is unequivocally one of the most operationally intense administrative workloads for K-12 schools, expanding colleges, and multi-campus universities. Attempting to draft a college timetable system by hand inherently cascades into overlapping faculty responsibilities, neglected student course selections, and incredibly sub-optimal physical classroom space deployment. 
              </p>
              <p>
                By clinging to outdated spreadsheets and disjointed, non-communicative applications, central administrators lose thousands of invaluable hours annually. These lost hours represent a massive financial and operational burden. Enter <strong>timetable management software</strong> that is inherently powered by modern artificial intelligence logic engines.
              </p>
              <p>
                Manual scheduling regularly invites the persistent problem of operational fragility. A singular change—perhaps a core professor requires a sudden class adjustment mid-semester—can trigger a massive cascading failure that disrupts dozens of existing classes. Administrative teams are then forced completely back to the drawing board under immense pressure to patch the schedule together. Such chaos damages the broader student experience and strains faculty morale severely. By deploying university scheduling software, institutional constraints—ranging from specific faculty availability restrictions to intricate room equipment requirements—are natively evaluated in perfect unison. 
              </p>
              <p>
                The underlying engine structurally guarantees academic scheduling automation by computing mathematically perfect arrays. More importantly, it can adapt to late-breaking adjustments instantly using its lightning-fast recalculation capabilities, maintaining systemic harmony natively. Read more about its impact in our <Link href="/university-timetable-software" className="text-blue-400 hover:text-blue-300 underline">university timetable software overview</Link>.
              </p>
              <p>
                Additionally, resource management remains an acute blind spot without modern intervention. Classrooms, dedicated laboratories, and sprawling lecture halls carry massive operational costs. Scheduling an intimately small seminar of fifteen master's students securely inside a two-hundred-seat lecture configuration wastes critical space that should have securely housed a core undergraduate introductory course. An advanced AI scheduling software inherently stops this structural mismatch dead in its tracks. It strategically assigns rooms primarily based tightly around capacity utilization heuristics, ensuring physical campus density is maximized fundamentally. 
              </p>
              <p>
                Expanding institutions face scalability walls that manual intervention simply cannot penetrate. As academic catalogs balloon—introducing new hybrid programs and highly interdisciplinary sequences—operational variables scale exponentially. Proper timetable management software easily scales to map thousands of complex inputs, ensuring your administrative capabilities never buckle. For an exclusive look specifically into the raw computational side, explore our dedicated <Link href="/ai-scheduling-software" className="text-blue-400 hover:text-blue-300 underline">AI scheduling software guide</Link>.
              </p>
            </div>
            <div className="pt-6 flex flex-col md:flex-row items-center gap-6">
               <Button asChild size="lg" className="btn-gradient px-8 h-12 rounded-xl shadow-lg shadow-blue-500/20">
                 <Link href="/scheduler">
                   Try Scheduler
                 </Link>
               </Button>
            </div>
          </section>
        </ScrollReveal>

        {/* ── KEY INTERNAL LINKS OVERVIEW ── */}
        <ScrollReveal width="100%">
          <div className="grid md:grid-cols-2 gap-6 mt-10">
            <Link href="/university-timetable-software" className="glass-card p-8 rounded-3xl border border-blue-500/10 hover:border-blue-500/30 transition-colors group">
               <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">University Timetable Software &rarr;</h3>
               <p className="text-brand-text-secondary">Discover how large-scale higher education institutions manage thousands of students effortlessly with our robust software platform.</p>
            </Link>
             <Link href="/ai-scheduling-software" className="glass-card p-8 rounded-3xl border border-violet-500/10 hover:border-violet-500/30 transition-colors group">
               <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-violet-400 transition-colors">AI Scheduling Software &rarr;</h3>
               <p className="text-brand-text-secondary">Dive deeply into the artificial intelligence mechanisms actively resolving your most extreme operational scheduling conflicts in seconds.</p>
            </Link>
          </div>
        </ScrollReveal>

        {/* ── STATS BAR ── */}
        <ScrollReveal width="100%">
          <div className="glass-card grid grid-cols-2 divide-x divide-white/5 md:grid-cols-4 mt-6">
            {stats.map((stat) => (
              <div key={stat.label} className="px-6 py-8 text-center">
                <p className="text-3xl font-bold gradient-text lg:text-4xl">{stat.value}</p>
                <p className="mt-1.5 text-sm text-brand-text-secondary">{stat.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* ── BREAKDOWN TEASER ── */}
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
        
        {/* ── MID-PAGE CTA ── */}
        <ScrollReveal width="100%">
            <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-[2rem] border border-white/10 bg-gradient-to-br from-blue-900/40 via-violet-900/20 to-black">
              <h2 className="text-3xl font-bold text-white mb-4">Transform Your Campus Scheduling Today</h2>
              <p className="text-brand-text-secondary mb-8 max-w-2xl text-lg mx-auto">
                Join leading educational enterprises using our university scheduling software logically to entirely eliminate timetable conflicts instantly. Designed exclusively for modern educational institutions.
              </p>
              <div className="flex justify-center gap-4">
                  <Button asChild size="lg" className="btn-gradient h-12 rounded-xl px-8 text-base shadow-lg shadow-blue-500/20">
                    <Link href="/dashboard" prefetch>
                      Open Dashboard
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-8 text-base border-white/20 hover:bg-white/5">
                    <Link href="/scheduler" prefetch>
                      Scheduler
                    </Link>
                  </Button>
              </div>
            </div>
        </ScrollReveal>

        {/* ── HOW IT WORKS ── */}
        <ScrollReveal width="100%" delay={0.2}>
          <section id="how-it-works" className="glass-card overflow-hidden rounded-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-7">
              <h3 className="text-2xl font-bold text-brand-text">How It Works</h3>
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

        {/* ── FAQ SECTION ── */}
        <ScrollReveal width="100%">
          <section className="space-y-8 glass-card p-10 lg:p-14 rounded-3xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-brand-text">Frequently Asked Questions</h2>
            </div>
            <div className="mx-auto max-w-3xl space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-black/30 p-6 rounded-2xl border border-white/5 shadow-inner">
                  <h3 className="text-lg font-bold text-white flex items-start gap-3">
                    <HelpCircle className="h-6 w-6 text-blue-400 shrink-0 mt-0.5" />
                    {faq.question}
                  </h3>
                  <p className="mt-3 text-brand-text-secondary leading-relaxed ml-9 text-base">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ── BOTTOM CTA ── */}
        <ScrollReveal width="100%">
          <div className="text-center py-20 px-4 glass-card border border-blue-500/20 bg-gradient-to-t from-blue-900/40 to-black rounded-[2rem]">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Automate Your Institution?</h2>
            <p className="text-xl text-brand-text-secondary mb-10 max-w-2xl mx-auto">
              Implement scalable AI scheduling software perfectly tailored for modern schools, colleges, and university frameworks. Let's make scheduling effortless. 
              <span className="block mt-4 text-emerald-400 font-semibold italic">Designed for modern educational institutions.</span>
            </p>
            <div className="flex justify-center gap-4 flex-col sm:flex-row">
              <Button asChild size="lg" className="btn-gradient h-16 rounded-xl px-12 text-xl shadow-2xl shadow-blue-500/20 font-bold">
                <Link href="/dashboard" prefetch>
                  Open Dashboard
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-16 rounded-xl px-12 text-xl shadow-2xl shadow-blue-500/20 font-bold border-white/20 hover:bg-white/5">
                <Link href="/scheduler" prefetch>
                  Scheduler
                </Link>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative border-t border-white/5 mt-auto">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="mx-auto grid w-full max-w-content gap-6 px-4 py-10 text-sm lg:grid-cols-2 lg:px-6">
          <div>
            <SiteLogo className="px-0" />
            <p className="mt-2 max-w-sm text-brand-text-secondary">
              Intelligent timetable and classroom scheduling platform for universities.
              Powered by advanced AI algorithms.
            </p>
          </div>
          <div className="lg:text-right">
             <Link href="/" className="mr-4 hover:text-white transition-colors">Home</Link>
             <Link href="/university-timetable-software" className="mr-4 hover:text-white transition-colors">University Software</Link>
             <Link href="/ai-scheduling-software" className="mr-4 hover:text-white transition-colors">AI Scheduling</Link>
             <Link href="/terms" className="mr-4 hover:text-white transition-colors">Terms of Service</Link>
             <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
      <ScrollToTop />
    </div>
  );
}
