import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/succession")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/succession" });
  },
});
