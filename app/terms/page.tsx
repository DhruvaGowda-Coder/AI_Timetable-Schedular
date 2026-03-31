import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TermsContent } from "@/components/legal/terms-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 lg:py-12">
      <Link
        href="/signup"
        prefetch
        className="inline-flex items-center gap-2 text-sm font-medium text-secondary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to signup
      </Link>

      <Card className="surface-card">
        <CardHeader className="pb-2">
          <CardTitle>Schedulr AI - Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <TermsContent />
        </CardContent>
      </Card>
    </div>
  );
}


