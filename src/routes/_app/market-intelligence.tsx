import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/market-intelligence")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/market-intel" });
  },
});
