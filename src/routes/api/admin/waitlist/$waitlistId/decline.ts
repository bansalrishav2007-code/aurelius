import { createFileRoute } from "@tanstack/react-router";
import { resolveAdminSession, declineWaitlistApplication } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/admin/waitlist/$waitlistId/decline")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const authed = await resolveAdminSession(request.headers.get("cookie"));
        if (!authed) {
          return Response.json({ error: "Admin session required." }, { status: 401 });
        }

        const body = (await request.json().catch(() => ({}))) as { reason?: string };
        const ok = await declineWaitlistApplication(params.waitlistId, body.reason?.trim());
        if (!ok) {
          return Response.json({ error: "Application not found." }, { status: 404 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
