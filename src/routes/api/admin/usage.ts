import { createFileRoute } from "@tanstack/react-router";
import { resolveAdminSession } from "@/lib/auth/service.server";
import { getUsageSummary } from "@/lib/usage/store.server";

export const Route = createFileRoute("/api/admin/usage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authed = await resolveAdminSession(request.headers.get("cookie"));
        if (!authed) return Response.json({ error: "Admin session required." }, { status: 401 });
        const usage = await getUsageSummary();
        return Response.json(usage);
      },
    },
  },
});
