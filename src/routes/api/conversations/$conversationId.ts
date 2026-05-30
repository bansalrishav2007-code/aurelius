import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { deleteConversation, getConversation } from "@/lib/chat/conversations.server";

export const Route = createFileRoute("/api/conversations/$conversationId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const conv = await getConversation(params.conversationId, auth.session.email);
        if (!conv) return Response.json({ error: "Not found." }, { status: 404 });
        return Response.json({ conversation: conv });
      },
      DELETE: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const ok = await deleteConversation(params.conversationId, auth.session.email);
        if (!ok) return Response.json({ error: "Not found." }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
