import { createFileRoute } from "@tanstack/react-router";
import { getAdminDashboardData, hasSuperAdminAccess, resolveAdminSession } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/admin/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookie = request.headers.get("cookie");
        const ok = await resolveAdminSession(cookie);
        if (!ok) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const data = await getAdminDashboardData();
        const superAdminAccess = await hasSuperAdminAccess(cookie);
        return Response.json({ ...data, superAdminAccess });
      },
    },
  },
});
