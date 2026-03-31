import dynamic from "next/dynamic";
import { AppRouteSkeleton } from "@/components/layout/app-route-skeleton";

const ProfilePage = dynamic(
  () => import("@/components/profile/profile-page").then((mod) => mod.ProfilePage),
  {
    loading: () => <AppRouteSkeleton />,
  }
);

export default function ProfileRoute() {
  return <ProfilePage />;
}


