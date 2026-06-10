import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { listAuditEventsForMember } from "@/lib/audit/store.server";

export const Route = createFileRoute("/api/member/audit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const events = await listAuditEventsForMember(auth.session.email, 200);
        return Response.json({ events });
      },
    },
  },
});
