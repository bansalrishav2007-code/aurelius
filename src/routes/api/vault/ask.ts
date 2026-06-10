import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { askVaultAssistant } from "@/lib/vault/document-analysis.server";
import { listMemberDocuments } from "@/lib/vault/store.server";
import { trackUsage } from "@/lib/usage/store.server";

export const Route = createFileRoute("/api/vault/ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Vault AI assistant");
        }

        const body = (await request.json().catch(() => ({}))) as { question?: string };
        const question = body.question?.trim();
        if (!question) {
          return Response.json({ error: "question is required." }, { status: 400 });
        }

        const docs = await listMemberDocuments(auth.session.email);
        const result = await askVaultAssistant(docs, question);
        await trackUsage(auth.session.email, "analyze");

        return Response.json(result);
      },
    },
  },
});
