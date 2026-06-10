import { createFileRoute } from "@tanstack/react-router";
import { requireExpertSession } from "@/lib/experts/guard.server";
import { listExpertInbox } from "@/lib/experts/chat.server";

export const Route = createFileRoute("/api/expert/chat/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireExpertSession(request);
        if (!auth.ok) return auth.response;

        const threads = await listExpertInbox(auth.expert.id);
        return Response.json({ threads });
      },
    },
  },
});
