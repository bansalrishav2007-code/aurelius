import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/wealth")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/wealth-overview" });
  },
});
