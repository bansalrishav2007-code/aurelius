import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/family-members")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/family-members" });
  },
});
