import { createFileRoute } from "@tanstack/react-router";
import { resolveAdminSession } from "@/lib/auth/service.server";
import { rejectMembershipApplication } from "@/lib/membership/service.server";

export const Route = createFileRoute("/api/admin/membership/applications/$applicationId/reject")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const authed = await resolveAdminSession(request.headers.get("cookie"));
        if (!authed) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const body = (await request.json().catch(() => ({}))) as { reason?: string };
        const result = await rejectMembershipApplication(params.applicationId, body.reason?.trim());

        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
