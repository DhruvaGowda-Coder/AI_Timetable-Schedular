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
        "group inline-flex items-center gap-3 rounded-md px-1 py-1 transition-colors",
        className
      )}
    >
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background/70 ring-1 ring-brand-border transition-transform group-hover:scale-105">
        <Image
          src="/logo.png"
          alt={`${APP_NAME} logo`}
          width={768}
          height={768}
          sizes="44px"
          className="h-full w-full scale-[1.22] object-cover object-top"
          priority
        />
      </span>
      <span className="hidden sm:inline-block text-lg font-semibold tracking-tight text-brand-text">{APP_NAME}</span>
    </Link>
  );
}

