import { Skeleton } from "@/components/ui/skeleton";

export function AppRouteSkeleton() {
  return (
    <div className="page-enter space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48 rounded-md" />
        <Skeleton className="h-4 w-80 max-w-full rounded-md" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-lg lg:col-span-4" />
        <Skeleton className="h-80 rounded-lg lg:col-span-8" />
      </div>
    </div>
  );
}


