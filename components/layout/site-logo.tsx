import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SiteLogoProps {
  className?: string;
}

export function SiteLogo({ className }: SiteLogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2 rounded-md px-1 py-1 transition-colors",
        className
      )}
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-brand-border transition-transform group-hover:scale-105">
        <Image
          src="/logo.png"
          alt={`${APP_NAME} logo`}
          width={768}
          height={768}
          sizes="40px"
          className="h-full w-full object-cover"
          priority
        />
      </span>
      <span className="text-base font-semibold tracking-tight text-brand-text">{APP_NAME}</span>
    </Link>
  );
}


