"use client";

import { useEffect, useState } from "react";
import { Copy, ImageIcon, Loader2, PaintBucket, Save, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BrandingConfig, PlanFeatures } from "@/lib/types";

interface BrandingSettingsProps {
  features: PlanFeatures | null;
  isLoading: boolean;
}

const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: "",
  institutionName: "",
  primaryColor: "#3b82f6",
};

export function BrandingSettings({ features, isLoading }: BrandingSettingsProps) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchBranding() {
      try {
        const res = await fetch("/api/profile/branding");
        if (res.ok) {
          const data = await res.json();
          if (data.branding) {
            setBranding(data.branding);
          }
        }
      } catch (e) {
        console.error("Failed to load branding", e);
      } finally {
        setIsFetching(false);
      }
    }
    if (features?.whiteLabel) {
      fetchBranding();
    } else {
      setIsFetching(false);
    }
  }, [features?.whiteLabel]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setBranding((prev) => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to save branding");
      }

      toast.success("Branding preferences saved successfully.");
    } catch (e: any) {
      toast.error(e.message || "Failed to save branding settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isFetching) {
    return (
      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PaintBucket className="h-4 w-4 text-secondary" />
            PDF Export Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6 text-sm text-brand-text-secondary">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading branding settings...
        </CardContent>
      </Card>
    );
  }

  if (!features || !features.whiteLabel) {
    return (
      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PaintBucket className="h-4 w-4 text-secondary" />
            PDF Export Branding (Institution)
          </CardTitle>
          <CardDescription>
            White-label your exported PDF timetables with your institution's logo and colors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-4 bg-secondary/5 border-secondary/20">
            <p className="text-sm font-medium text-brand-text">Institution Plan required</p>
            <p className="mt-1 text-xs text-brand-text-secondary">
              Institution tier is required to customize PDF branding.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PaintBucket className="h-4 w-4 text-secondary" />
          PDF Export Branding
        </CardTitle>
        <CardDescription>
          Customize the header of your exported PDFs to match your institution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="institutionName">Institution Name</Label>
              <Input
                id="institutionName"
                placeholder="e.g. Schedulr University"
                value={branding.institutionName}
                onChange={(e) => setBranding({ ...branding, institutionName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColorPicker"
                  type="color"
                  className="w-12 p-1 cursor-pointer"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                />
                <Input
                  id="primaryColor"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  placeholder="#3b82f6"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Institution Logo</Label>
              <div className="flex items-center gap-4">
                {branding.logoUrl ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-brand-border bg-white flex items-center justify-center">
                    <img src={branding.logoUrl} alt="Logo preview" className="object-contain max-h-full max-w-full" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-dashed border-brand-border bg-secondary/5">
                    <ImageIcon className="h-6 w-6 text-brand-text-secondary/50" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    onChange={handleLogoUpload}
                    className="text-xs" 
                  />
                  <p className="text-[10px] text-brand-text-secondary">
                    Max 2MB. Recommended 200x200px PNG transparent.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-brand-border bg-card p-4">
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
              PDF Preview
            </Label>
            <div 
              className="mt-2 h-24 overflow-hidden rounded-md border"
              style={{ backgroundColor: branding.primaryColor || "#3b82f6" }}
            >
              <div className="flex h-full items-center px-4 py-2 gap-3 text-white">
                {branding.logoUrl ? (
                  <div className="h-10 w-10 shrink-0 bg-white rounded-sm p-0.5 flex items-center justify-center overflow-hidden shadow-sm">
                    <img src={branding.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-10 w-10 shrink-0 bg-white/20 rounded-sm p-2 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-white/50" />
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <h3 className="truncate font-bold text-lg leading-tight">
                    {branding.institutionName || "Institution Name"}
                  </h3>
                  <div className="mt-1 h-2 w-1/3 rounded-full bg-white/30" />
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs italic text-brand-text-secondary">
              This header will replace the default Schedulr AI header on PDF exports.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Branding
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


