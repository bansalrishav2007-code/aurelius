import { createFileRoute } from "@tanstack/react-router";
import { requireSuperAdmin, updateWaitlistNotes } from "@/lib/auth/founder.service.server";

export const Route = createFileRoute("/api/founder/waitlist/$waitlistId/notes")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const cookie = request.headers.get("cookie");
        if (!(await requireSuperAdmin(cookie))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }
        const body = (await request.json().catch(() => ({}))) as { adminNotes?: string };
        if (body.adminNotes === undefined) {
          return Response.json({ error: "adminNotes is required." }, { status: 400 });
        }
        const ok = await updateWaitlistNotes(params.waitlistId, body.adminNotes);
        if (!ok) return Response.json({ error: "Application not found." }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
