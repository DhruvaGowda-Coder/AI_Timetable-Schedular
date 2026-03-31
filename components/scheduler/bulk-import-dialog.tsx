"use client";

import { useState } from "react";
import { Upload, X, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { SchedulerConstraints } from "@/lib/types";

interface BulkImportDialogProps {
    onImport: (constraints: Partial<SchedulerConstraints>) => void;
    disabled?: boolean;
    disabledMessage?: string;
}

export function BulkImportDialog({
    onImport,
    disabled = false,
    disabledMessage = "Excel import is available on Pro plans and above.",
}: BulkImportDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            if (
                selected.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                selected.name.endsWith(".xlsx")
            ) {
                setFile(selected);
            } else {
                toast.error("Please upload a valid .xlsx file.");
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/bulk-import", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to parse file");
            }

            const data = await response.json();
            onImport(data.constraints);
            toast.success("Data imported successfully!");
            setIsOpen(false);
            setFile(null);
        } catch {
            toast.error("Error importing file. Please check the format.");
        } finally {
            setIsUploading(false);
        }
    };

    if (disabled) {
        return (
            <Button
                variant="outline"
                className="gap-2"
                type="button"
                onClick={() => toast.info(disabledMessage)}
            >
                <Upload className="h-4 w-4" />
                Bulk Import (Pro)
            </Button>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Bulk Import
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Schedule Data</DialogTitle>
                    <DialogDescription>
                        Upload an Excel file (.xlsx) with sheets named Subjects, Faculty, and Rooms.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-center w-full">
                        <label
                            htmlFor="dropzone-file"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/5 hover:bg-secondary/10 border-muted-foreground/25"
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FileSpreadsheet className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-1 text-sm text-brand-text">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-brand-text-secondary">XLSX files only</p>
                            </div>
                            <input
                                id="dropzone-file"
                                type="file"
                                className="hidden"
                                accept=".xlsx"
                                onChange={handleFileChange}
                            />
                        </label>
                    </div>

                    {file && (
                        <div className="flex items-center justify-between p-2 text-sm border rounded bg-muted/30">
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setFile(null)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    )}

                    <div className="text-xs text-muted-foreground space-y-1 bg-secondary/10 p-3 rounded">
                        <p className="font-medium text-brand-text">Expected Columns:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                            <li>Sheet <span className="font-mono">Subjects</span>: Name, Weekly Hours</li>
                            <li>Sheet <span className="font-mono">Faculty</span>: Name, Can Teach (comma-separated)</li>
                            <li>Sheet <span className="font-mono">Rooms</span>: Name, Capacity</li>
                        </ul>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={!file || isUploading}>
                        {isUploading ? "Importing..." : "Import Data"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}


