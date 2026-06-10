import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { appendMessages } from "@/lib/chat/conversations.server";
import { appendAiMemory } from "@/lib/privacy/memory.server";

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

        const userMsg = body.messages.find((m) => m.role === "user");
        const assistantMsg = body.messages.find((m) => m.role === "assistant");
        if (userMsg && assistantMsg && !auth.session.isDemo) {
          await appendAiMemory(auth.memberId, auth.session.email, {
            type: "conversation_summary",
            content: `Asked: "${userMsg.content.slice(0, 280)}". Aurelius advised: "${assistantMsg.content.slice(0, 500)}"`,
            sourceId: params.conversationId,
          });
        }

        return Response.json({ conversation: conv });
      },
    },
  },
});
