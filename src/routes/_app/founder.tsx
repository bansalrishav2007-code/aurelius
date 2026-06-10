import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getAuthSession } from "@/lib/auth/session.functions";

export const Route = createFileRoute("/_app/founder")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Outlet />,
});
