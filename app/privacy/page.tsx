import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 lg:py-12">
      <Link
        href="/terms"
        prefetch
        className="inline-flex items-center gap-2 text-sm font-medium text-secondary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to terms
      </Link>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-brand-text-secondary">
          <p>
            Your privacy matters to us. We collect only the data required to provide scheduling,
            authentication, billing, and support functionality.
          </p>
          <p>
            We use secure third-party providers such as Stripe for payments and do not store full
            payment card details on our servers.
          </p>
          <p>
            If you need full privacy policy text, contact us at
            {" "}
            <a className="font-medium text-secondary hover:underline" href="mailto:dhruvagowda2006@gmail.com">
              dhruvagowda2006@gmail.com
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}



