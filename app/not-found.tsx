import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-full bg-muted/40 p-6">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-brand-text">Page Not Found</h2>
        <p className="text-muted-foreground max-w-[500px]">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or deleted.
        </p>
      </div>
      <Button asChild size="lg" className="mt-2">
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}


