import { createFileRoute } from "@tanstack/react-router";
import { resolveAdminSession } from "@/lib/auth/service.server";
import { getMembershipAdminStats } from "@/lib/membership/service.server";

export const Route = createFileRoute("/api/admin/membership/applications/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authed = await resolveAdminSession(request.headers.get("cookie"));
        if (!authed) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const stats = await getMembershipAdminStats();
        return Response.json({
          applications: stats.applications,
          pendingApplications: stats.pendingApplications,
          byTier: stats.byTier,
          memberCount: stats.memberCount,
          pendingUpgrades: stats.pendingUpgrades,
          recentActivity: stats.recentActivity,
          upgradeRequests: stats.upgradeRequests,
        });
      },
    },
  },
});
