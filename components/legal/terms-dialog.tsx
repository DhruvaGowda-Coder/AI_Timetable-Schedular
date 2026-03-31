"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TERMS_LAST_UPDATED, TermsContent } from "@/components/legal/terms-content";

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  title?: string;
  description?: string;
  acceptLabel?: string;
}

export function TermsDialog({
  open,
  onOpenChange,
  onAccept,
  title = "Schedulr AI Terms and Conditions",
  description = "Please read and accept before continuing.",
  acceptLabel = "I have read and agree",
}: TermsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl p-0">
        <div className="border-b border-brand-border px-5 py-4">
          <DialogHeader>
            <DialogTitle className="text-brand-text">{title}</DialogTitle>
            <DialogDescription>
              {description} Last updated: {TERMS_LAST_UPDATED}.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="thin-scrollbar max-h-[68vh] overflow-y-auto px-5 py-4">
          <TermsContent showTitle={false} />
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t border-brand-border px-5 py-4">
          <Button asChild variant="ghost" className="px-0 text-secondary hover:text-secondary">
            <Link href="/terms" prefetch>
              Open full Terms page
            </Link>
          </Button>
          {onAccept ? (
            <Button
              type="button"
              onClick={() => {
                onAccept();
                onOpenChange(false);
              }}
            >
              {acceptLabel}
            </Button>
          ) : (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



