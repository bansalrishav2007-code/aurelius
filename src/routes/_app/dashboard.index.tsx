import { createFileRoute } from "@tanstack/react-router";
import { DashboardContent } from "@/routes/_app/dashboard";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — Aurelius" }] }),
  component: DashboardIndexPage,
});

function DashboardIndexPage() {
  const { session } = AppRoute.useRouteContext();
  return <DashboardContent session={session} />;
}
