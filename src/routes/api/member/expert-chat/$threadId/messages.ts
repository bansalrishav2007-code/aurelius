import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { appendExpertChatMessage, getThreadForMember } from "@/lib/experts/chat.server";

export const Route = createFileRoute("/api/member/expert-chat/$threadId/messages")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as {
          content?: string;
          documentIds?: string[];
        };

        if (!body.content?.trim()) {
          return Response.json({ error: "Message content required." }, { status: 400 });
        }

        const msg = await appendExpertChatMessage({
          threadId: params.threadId,
          sender: "member",
          memberEmail: auth.session.email,
          content: body.content,
          documentIds: body.documentIds,
          memberId: auth.memberId,
        });

        if (!msg) return Response.json({ error: "Thread not found." }, { status: 404 });

        const thread = await getThreadForMember(params.threadId, auth.session.email);
        return Response.json({ message: msg, thread });
      },
    },
  },
});
