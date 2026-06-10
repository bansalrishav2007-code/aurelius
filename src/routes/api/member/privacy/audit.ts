import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { listPrivacyAudit } from "@/lib/privacy/audit.server";

export const Route = createFileRoute("/api/member/privacy/audit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const entries = await listPrivacyAudit(auth.memberId);
        return Response.json({ entries });
      },
    },
  },
});
