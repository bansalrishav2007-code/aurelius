import { createFileRoute } from "@tanstack/react-router";
import { resolveAdminSession, revokeMember } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/admin/members/$memberId/revoke")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const authed = await resolveAdminSession(request.headers.get("cookie"));
        if (!authed) return Response.json({ error: "Admin session required." }, { status: 401 });
        const ok = await revokeMember(params.memberId);
        if (!ok) return Response.json({ error: "Member not found." }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
