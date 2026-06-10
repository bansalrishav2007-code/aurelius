import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/expert/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/expert" });
  },
});
