"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Button } from "@/components/ui/button";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
    error: _error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <div className="flex h-screen w-full flex-col items-center justify-center gap-6 text-center px-4 bg-background text-foreground">
                    <h2 className="text-3xl font-bold tracking-tight">Something went wrong!</h2>
                    <p className="text-muted-foreground max-w-[500px]">
                        A critical error occurred preventing the application from loading.
                    </p>
                    <Button onClick={() => reset()} size="lg">
                        Try again
                    </Button>
                </div>
            </body>
        </html>
    );
}


