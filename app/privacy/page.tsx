import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import {
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_LAST_UPDATED,
  privacyContactContent,
  privacySections,
  privacySummary,
} from "@/components/legal/privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for using TimetabiQ.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      label="Data & Privacy"
      effectiveDate={PRIVACY_EFFECTIVE_DATE}
      lastUpdated={PRIVACY_LAST_UPDATED}
      summary={privacySummary}
      sections={privacySections}
      contactTitle="Contact the Privacy Team"
      contactBody={privacyContactContent}
    />
  );
}
