import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getAuthSession } from "@/lib/auth/session.functions";
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const session = await getAuthSession();
    if (!session) {
      const returnTo = location.pathname + location.search;
      throw redirect({
        to: "/login",
        search: returnTo && returnTo !== "/" ? { redirect: returnTo, expired: "1" } : { expired: "1" },
      });
    }

    if (session.isDemo) {
      throw redirect({ to: "/demo/workspace" });
    }

    const path = location.pathname;

    if (session.role === "EXPERT" && !path.startsWith("/expert") && path !== "/profile") {
      throw redirect({ to: "/expert" });
    }

    const onboardingPaths = ["/welcome", "/getting-started", "/profile", "/vault", "/dashboard/wealth-overview", "/dashboard/experts"];

    if (
      session.onboardingComplete === false &&
      session.role !== "EXPERT" &&
      session.role !== "SUPER_ADMIN" &&
      !onboardingPaths.some((p) => path.startsWith(p))
    ) {
      throw redirect({ to: "/welcome" });
    }

    if (
      session.dashboardUnlocked === false &&
      session.role !== "EXPERT" &&
      session.role !== "SUPER_ADMIN" &&
      !onboardingPaths.some((p) => path.startsWith(p))
    ) {
      throw redirect({ to: "/getting-started" });
    }

    return { session };
  },
  component: AppShell,
});
