import { createFileRoute } from "@tanstack/react-router";
import { resolveAdminSession, revokeInvite } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/admin/invites/$inviteId")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const ok = await resolveAdminSession(request.headers.get("cookie"));
        if (!ok) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const revoked = await revokeInvite(params.inviteId);
        if (!revoked) {
          return Response.json({ error: "Invite not found." }, { status: 404 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
