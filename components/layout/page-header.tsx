import { cn } from "@/lib/utils";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  backLink?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, action, backLink, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 rounded-lg border bg-card p-6 shadow-soft lg:flex-row lg:flex-wrap lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {backLink && (
          <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0">
            <Link href={backLink}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-brand-text lg:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-brand-text-secondary">{subtitle}</p>
        </div>
      </div>
      {action ? <div className="w-full min-w-0 lg:w-auto">{action}</div> : null}
    </div>
  );
}


