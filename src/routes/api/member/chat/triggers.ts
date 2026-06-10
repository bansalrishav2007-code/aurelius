import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { computeAdvisorTriggers } from "@/lib/chat/triggers.server";

export const Route = createFileRoute("/api/member/chat/triggers")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const triggers = await computeAdvisorTriggers(auth.session.email);
        return Response.json({ triggers });
      },
    },
  },
});
