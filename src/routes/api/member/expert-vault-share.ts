import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { approveVaultSharing } from "@/lib/experts/relations.server";

export const Route = createFileRoute("/api/member/expert-vault-share")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as {
          expertId?: string;
          mainConcern?: string;
        };

        if (!body.expertId) {
          return Response.json({ error: "Expert id required." }, { status: 400 });
        }

        const relation = await approveVaultSharing({
          expertId: body.expertId,
          memberEmail: auth.session.email,
          memberName: auth.session.fullName,
          mainConcern: body.mainConcern,
        });

        return Response.json({ relation });
      },
    },
  },
});
