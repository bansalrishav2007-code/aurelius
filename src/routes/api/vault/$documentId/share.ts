import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { createVaultShareLink } from "@/lib/vault/share.server";

export const Route = createFileRoute("/api/vault/$documentId/share")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Document sharing");
        }

        const body = (await request.json().catch(() => ({}))) as { audience?: "expert" | "family" };
        const audience = body.audience === "family" ? "family" : "expert";

        const link = await createVaultShareLink(auth.session.email, params.documentId, audience);
        if (!link) return Response.json({ error: "Document not found." }, { status: 404 });

        const origin = new URL(request.url).origin;
        return Response.json({
          ...link,
          fullUrl: `${origin}${link.url}`,
        });
      },
    },
  },
});
