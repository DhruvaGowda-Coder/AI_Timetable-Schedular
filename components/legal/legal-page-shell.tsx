import type { ReactNode } from "react";
import Link from "next/link";
import { Clock3, FileText, Home, Mail } from "lucide-react";
import { SiteLogo } from "@/components/layout/site-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface LegalSectionDefinition {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalPageShellProps {
  title: string;
  label: string;
  lastUpdated: string;
  effectiveDate: string;
  summary: ReactNode;
  sections: LegalSectionDefinition[];
  contactTitle: string;
  contactBody: ReactNode;
}

const proseClassName =
  "space-y-4 text-sm leading-7 text-brand-text-secondary [&_a]:font-medium [&_a]:text-secondary [&_a:hover]:text-brand-text [&_a:hover]:underline [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_p]:text-brand-text-secondary [&_strong]:text-brand-text [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2";

function TableOfContents({ sections }: { sections: LegalSectionDefinition[] }) {
  return (
    <Card className="glass-card border-white/10">
      <CardContent className="space-y-4 px-5 pb-5 pt-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-text">
          <FileText className="h-4 w-4 text-blue-400" />
          On This Page
        </div>
        <nav aria-label="Legal page table of contents">
          <ul className="space-y-2 text-sm text-brand-text-secondary">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex items-start gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5 hover:text-brand-text"
                >
                  <span className="mt-0.5 text-xs font-semibold text-blue-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{section.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </CardContent>
    </Card>
  );
}

export function LegalPageShell({
  title,
  label,
  lastUpdated,
  effectiveDate,
  summary,
  sections,
  contactTitle,
  contactBody,
}: LegalPageShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="mesh-gradient" />
      <div className="orb orb-blue" style={{ width: 420, height: 420, top: "-8%", left: "8%" }} />
      <div className="orb orb-cyan" style={{ width: 360, height: 360, bottom: "4%", right: "8%" }} />

      <header className="glass-card sticky top-0 z-40 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex w-full max-w-content items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <SiteLogo className="px-0" />
            <Badge className="hidden rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-blue-400 md:inline-flex">
              Legal
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              asChild
              variant="outline"
              className="rounded-lg border-brand-border/60 bg-transparent backdrop-blur-sm"
            >
              <Link href="/" prefetch>
                <Home className="h-4 w-4" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="page-enter mx-auto w-full max-w-content px-4 py-10 lg:px-6 lg:py-12">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
          <div className="space-y-6">
            <Badge className="rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-violet-400">
              {label}
            </Badge>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-brand-text lg:text-5xl">
                {title}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm text-brand-text-secondary">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-border/70 bg-white/5 px-3 py-1.5">
                  <Clock3 className="h-4 w-4 text-blue-400" />
                  Effective {effectiveDate}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-border/70 bg-white/5 px-3 py-1.5">
                  <FileText className="h-4 w-4 text-violet-400" />
                  Last updated {lastUpdated}
                </span>
              </div>
            </div>

            <Card className="glass-card glow-border border-white/10">
              <CardContent className={cn("px-6 pb-6 pt-6", proseClassName)}>{summary}</CardContent>
            </Card>

            <div className="xl:hidden">
              <TableOfContents sections={sections} />
            </div>

            <div className="space-y-5">
              {sections.map((section, index) => (
                <Card
                  key={section.id}
                  id={section.id}
                  className="glass-card border-white/10 scroll-mt-28"
                >
                  <CardContent className="space-y-4 px-6 pb-6 pt-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h2 className="text-xl font-semibold text-brand-text">{section.title}</h2>
                    </div>
                    <div className={proseClassName}>{section.content}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="glass-card glow-border border-white/10">
              <CardContent className="space-y-4 px-6 pb-6 pt-6">
                <div className="flex items-center gap-2 text-lg font-semibold text-brand-text">
                  <Mail className="h-5 w-5 text-cyan-400" />
                  {contactTitle}
                </div>
                <div className={proseClassName}>{contactBody}</div>
              </CardContent>
            </Card>
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-24">
              <TableOfContents sections={sections} />
            </div>
          </aside>
        </div>
      </main>

      <footer className="relative border-t border-white/5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        <div className="mx-auto flex w-full max-w-content flex-col gap-3 px-4 py-6 text-sm text-brand-text-secondary lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/terms" prefetch className="transition-colors hover:text-brand-text">
              Terms
            </Link>
            <Link href="/privacy" prefetch className="transition-colors hover:text-brand-text">
              Privacy
            </Link>
            <a
              href="mailto:dhruvagowda2006@gmail.com"
              className="transition-colors hover:text-brand-text"
            >
              dhruvagowda2006@gmail.com
            </a>
          </div>
        </div>
      </footer>
      <ScrollToTop />
    </div>
  );
}
