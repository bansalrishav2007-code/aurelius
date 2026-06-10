import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/entities")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/legal-entities" });
  },
});
