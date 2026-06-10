import { createFileRoute } from "@tanstack/react-router";
import { requireExpertSession } from "@/lib/experts/guard.server";
import { appendExpertChatMessage, getThreadForExpert } from "@/lib/experts/chat.server";

export const Route = createFileRoute("/api/expert/chat/$threadId/messages")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireExpertSession(request);
        if (!auth.ok) return auth.response;

        const thread = await getThreadForExpert(params.threadId, auth.expert.id);
        if (!thread) return Response.json({ error: "Thread not found." }, { status: 404 });
        return Response.json({ thread });
      },
      POST: async ({ request, params }) => {
        const auth = await requireExpertSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as { content?: string };
        if (!body.content?.trim()) {
          return Response.json({ error: "Message content required." }, { status: 400 });
        }

        const msg = await appendExpertChatMessage({
          threadId: params.threadId,
          sender: "expert",
          expertId: auth.expert.id,
          content: body.content,
        });

        if (!msg) return Response.json({ error: "Thread not found." }, { status: 404 });

        const thread = await getThreadForExpert(params.threadId, auth.expert.id);
        return Response.json({ message: msg, thread });
      },
    },
  },
});
