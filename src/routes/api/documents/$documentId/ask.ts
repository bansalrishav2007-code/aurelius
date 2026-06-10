import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { askAboutDocument } from "@/lib/vault/document-analysis.server";
import { getDocument } from "@/lib/vault/store.server";
import { trackUsage } from "@/lib/usage/store.server";

export const Route = createFileRoute("/api/documents/$documentId/ask")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Document Q&A");
        }

        const body = (await request.json().catch(() => ({}))) as { question?: string };
        const question = body.question?.trim();
        if (!question) {
          return Response.json({ error: "question is required." }, { status: 400 });
        }

        const doc = await getDocument(params.documentId, auth.session.email);
        if (!doc) return Response.json({ error: "Document not found." }, { status: 404 });

        const answer = await askAboutDocument(doc, question, doc.analysis);
        await trackUsage(auth.session.email, "analyze");

        return Response.json({ answer });
      },
    },
  },
});
