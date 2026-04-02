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
    "university scheduling software",
    "timetable management software",
  ],
  metadataBase: new URL("https://timetabiq.com"),
  openGraph: {
    title: "TimetabiQ — AI Timetable Management Software",
    description: "Automate academic scheduling with AI-powered timetable software for schools, colleges, and universities.",
    type: "website",
    url: "https://timetabiq.com",
    siteName: "TimetabiQ",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "TimetabiQ Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "TimetabiQ — AI Timetable Management Software",
    description: "Automate academic scheduling with AI-powered timetable software for schools, colleges, and universities.",
    images: ["/logo.png"],
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

