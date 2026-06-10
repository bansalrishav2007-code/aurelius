import { createFileRoute } from "@tanstack/react-router";
import { generateConversationTitle } from "@/lib/ai/conversation-title.server";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { updateConversationTitle } from "@/lib/chat/conversations.server";

export const Route = createFileRoute("/api/conversations/$conversationId/title")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as { message?: string };
        if (!body.message?.trim()) {
          return Response.json({ error: "message required." }, { status: 400 });
        }

        try {
          const title = await generateConversationTitle(body.message.trim());
          const conv = await updateConversationTitle(
            params.conversationId,
            auth.session.email,
            title,
          );
          if (!conv) return Response.json({ error: "Not found." }, { status: 404 });
          return Response.json({ conversation: conv, title });
        } catch (err) {
          console.error("[AI Advisor] Title endpoint error:", err);
          return Response.json({ error: "Title generation failed." }, { status: 502 });
        }
      },
    },
  },
});
