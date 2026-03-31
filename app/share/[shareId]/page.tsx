import { Metadata } from "next";
import { SharePageClient } from "./share-page-client";

interface SharePageProps {
  params: Promise<{ shareId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: SharePageProps): Promise<Metadata> {
  const { shareId } = await params;
  const faculty = (await searchParams).faculty as string | undefined;
  const title = faculty ? `${faculty}'s Timetable — Schedulr AI` : `Shared Timetable — Schedulr AI`;
  return {
    title,
    description: `View a shared timetable created with Schedulr AI. Share ID: ${shareId}`,
    openGraph: {
      title,
      description: "View this AI-generated timetable on Schedulr AI.",
    },
  };
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { shareId } = await params;
  const faculty = (await searchParams).faculty as string | undefined;
  return <SharePageClient shareId={shareId} faculty={faculty} />;
}
