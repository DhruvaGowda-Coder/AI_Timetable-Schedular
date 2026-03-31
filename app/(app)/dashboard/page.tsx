import dynamic from "next/dynamic";
import { AppRouteSkeleton } from "@/components/layout/app-route-skeleton";

const DashboardPage = dynamic(
  () => import("@/components/dashboard/dashboard-page").then((mod) => mod.DashboardPage),
  {
    loading: () => <AppRouteSkeleton />,
  }
);

export default function DashboardRoute() {
  return <DashboardPage />;
}


