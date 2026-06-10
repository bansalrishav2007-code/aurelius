import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DashboardContent } from "@/routes/_app/dashboard";
import { getPostAuthPath } from "@/lib/auth/redirect-after-auth";
import { getAuthSession } from "@/lib/auth/session.functions";

export const Route = createFileRoute("/demo/workspace")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (!session) throw redirect({ to: "/demo" });
    if (!session.isDemo) throw redirect({ to: getPostAuthPath(session) });
    return { session };
  },
  head: () => ({ meta: [{ title: "Private Office Preview — Aurelius" }] }),
  component: DemoWorkspacePage,
});

function DemoWorkspacePage() {
  const { session } = Route.useRouteContext();

  return (
    <AppShell session={session} mode="demo-workspace">
      <DashboardContent session={session} demoWorkspace />
    </AppShell>
  );
}
