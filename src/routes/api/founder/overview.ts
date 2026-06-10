import { createFileRoute } from "@tanstack/react-router";
import { getFounderOverview, requireSuperAdmin } from "@/lib/auth/founder.service.server";

export const Route = createFileRoute("/api/founder/overview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookie = request.headers.get("cookie");
        if (!(await requireSuperAdmin(cookie))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }
        const data = await getFounderOverview();
        return Response.json(data);
      },
    },
  },
});
