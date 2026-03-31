import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="page-enter min-h-screen">
      <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8 lg:px-6 lg:py-10">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 max-w-full rounded-md" />
          <Skeleton className="h-4 w-[38rem] max-w-full rounded-md" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-72 rounded-lg lg:col-span-4" />
          <Skeleton className="h-72 rounded-lg lg:col-span-8" />
        </div>
      </div>
    </div>
  );
}


