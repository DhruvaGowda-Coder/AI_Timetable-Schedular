import { Suspense } from "react";
import { Metadata } from "next";
import { AcceptInviteClient } from "./accept-invite-client";

export const metadata: Metadata = {
  title: "Accept Invitation — Schedulr AI",
  description: "Join a workspace on Schedulr AI to collaborate on timetables.",
};

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
      </div>
    }>
      <AcceptInviteClient />
    </Suspense>
  );
}


