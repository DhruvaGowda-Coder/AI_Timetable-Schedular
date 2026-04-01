import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import {
  TERMS_EFFECTIVE_DATE,
  TERMS_LAST_UPDATED,
  termsContactContent,
  termsSections,
  termsSummary,
} from "@/components/legal/terms-content";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and Conditions for using TimetabiQ.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms & Conditions"
      label="Legal Terms"
      effectiveDate={TERMS_EFFECTIVE_DATE}
      lastUpdated={TERMS_LAST_UPDATED}
      summary={termsSummary}
      sections={termsSections}
      contactTitle="Contact the Legal Team"
      contactBody={termsContactContent}
    />
  );
}
