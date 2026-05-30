import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { createConversation, listConversations } from "@/lib/chat/conversations.server";

export const Route = createFileRoute("/api/conversations/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const conversations = await listConversations(auth.session.email);
        return Response.json({ conversations });
      },
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const body = (await request.json().catch(() => ({}))) as { title?: string };
        const conv = await createConversation(auth.session.email, body.title);
        return Response.json({ conversation: conv });
      },
    },
  },
});
