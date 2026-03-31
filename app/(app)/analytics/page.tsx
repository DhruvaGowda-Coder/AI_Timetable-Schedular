import dynamic from "next/dynamic";
import { AppRouteSkeleton } from "@/components/layout/app-route-skeleton";

const AnalyticsPage = dynamic(
  () => import("@/components/analytics/analytics-page").then((mod) => mod.AnalyticsPage),
  {
    loading: () => <AppRouteSkeleton />,
  }
);

export default function AnalyticsRoute() {
  return <AnalyticsPage />;
}


