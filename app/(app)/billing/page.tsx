import dynamic from "next/dynamic";
import { AppRouteSkeleton } from "@/components/layout/app-route-skeleton";

const BillingPage = dynamic(
  () => import("@/components/billing/billing-page").then((mod) => mod.BillingPage),
  {
    loading: () => <AppRouteSkeleton />,
  }
);

export default function BillingRoute() {
  return <BillingPage />;
}


