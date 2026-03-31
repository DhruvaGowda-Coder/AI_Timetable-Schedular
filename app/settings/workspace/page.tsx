import { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceSettingsClient } from "./workspace-settings-client";

export const metadata: Metadata = {
  title: "Workspace Settings — Schedulr AI",
  description: "Manage your team, workspaces, and permissions.",
};

export default function WorkspaceSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4 pt-8 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-brand-text">Workspace Settings</h1>
        <p className="text-muted-foreground">Manage your team and invite collaborators.</p>
      </div>
      
      <Suspense fallback={
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      }>
        <WorkspaceSettingsClient />
      </Suspense>
    </div>
  );
}


