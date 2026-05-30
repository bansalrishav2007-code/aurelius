import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { appendMessages } from "@/lib/chat/conversations.server";

export const Route = createFileRoute("/api/conversations/$conversationId/messages")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as {
          messages?: { role: "user" | "assistant"; content: string }[];
          documentIds?: string[];
        };

        if (!body.messages?.length) {
          return Response.json({ error: "messages required." }, { status: 400 });
        }

        const conv = await appendMessages(params.conversationId, auth.session.email, body.messages, body.documentIds);
        if (!conv) return Response.json({ error: "Not found." }, { status: 404 });
        return Response.json({ conversation: conv });
      },
    },
  },
});
