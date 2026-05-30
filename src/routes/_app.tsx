import { createFileRoute } from "@tanstack/react-router";
import { redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getAuthSession } from "@/lib/auth/session.functions";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (!session) {
      throw redirect({ to: "/access" });
    }
    return { session };
  },
  component: AppShell,
});
