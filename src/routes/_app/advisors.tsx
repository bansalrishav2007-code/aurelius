import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/advisors")({
  beforeLoad: () => {
    throw redirect({ to: "/experts" });
  },
});
