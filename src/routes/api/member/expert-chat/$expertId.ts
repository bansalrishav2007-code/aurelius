import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { getOrCreateThread } from "@/lib/experts/chat.server";
import { getRelationForExpert } from "@/lib/experts/relations.server";

export const Route = createFileRoute("/api/member/expert-chat/$expertId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const thread = await getOrCreateThread({
          expertId: params.expertId,
          memberEmail: auth.session.email,
          memberName: auth.session.fullName,
          memberId: auth.memberId,
        });

        const relation = await getRelationForExpert(params.expertId, auth.session.email);

        return Response.json({
          thread,
          vaultShareApproved: relation?.vaultShareApproved ?? false,
        });
      },
    },
  },
});
