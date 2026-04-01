import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { PwaInit } from "@/components/pwa-init";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "TimetabiQ | AI Timetable Scheduler",
    template: "%s | TimetabiQ",
  },
  description:
    "Professional AI-powered timetable scheduling with dashboard analytics, exports, notifications, and billing.",
  keywords: [
    "AI timetable scheduler",
    "school scheduling",
    "college timetable",
    "scheduler dashboard",
  ],
  openGraph: {
    title: "TimetabiQ",
    description: "AI-powered timetable scheduling platform.",
    type: "website",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <AppProviders>
          {children}
          <PwaInit />
        </AppProviders>
      </body>
    </html>
  );
}

