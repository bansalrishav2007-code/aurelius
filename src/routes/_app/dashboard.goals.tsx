import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/goals")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/goals-planning" });
  },
});
