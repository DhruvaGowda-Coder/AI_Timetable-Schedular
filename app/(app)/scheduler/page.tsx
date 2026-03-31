import dynamic from "next/dynamic";
import { AppRouteSkeleton } from "@/components/layout/app-route-skeleton";

const SchedulerPage = dynamic(
  () => import("@/components/scheduler/scheduler-page").then((mod) => mod.SchedulerPage),
  {
    loading: () => <AppRouteSkeleton />,
  }
);

export default function SchedulerRoute() {
  return <SchedulerPage />;
}


