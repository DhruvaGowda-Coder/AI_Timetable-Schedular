import dynamic from "next/dynamic";
import { AppRouteSkeleton } from "@/components/layout/app-route-skeleton";

const NotificationsPage = dynamic(
  () => import("@/components/notifications/notifications-page").then((mod) => mod.NotificationsPage),
  {
    loading: () => <AppRouteSkeleton />,
  }
);

export default function NotificationsRoute() {
  return <NotificationsPage />;
}


