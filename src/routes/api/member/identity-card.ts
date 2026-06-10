import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { buildIdentityCard } from "@/lib/membership/identity-card.server";

export const Route = createFileRoute("/api/member/identity-card")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        try {
          const card = await buildIdentityCard(auth.memberId, auth.session);
          return Response.json({ card });
        } catch (err) {
          console.error("[Identity Card] Failed to build card:", err);
          return Response.json({ error: "Unable to load membership card." }, { status: 500 });
        }
      },
    },
  },
});
