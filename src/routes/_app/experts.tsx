import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/experts")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/experts" });
  },
});
