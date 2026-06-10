import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { logPrivacyAudit } from "@/lib/privacy/audit.server";
import { appendAiMemory } from "@/lib/privacy/memory.server";
import { analyzeVaultDocument } from "@/lib/vault/document-analysis.server";
import { extractDocumentText } from "@/lib/vault/extract-text.server";
import { getDocument, updateDocument } from "@/lib/vault/store.server";
import { trackUsage } from "@/lib/usage/store.server";

export const Route = createFileRoute("/api/documents/$documentId/analyze")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Document analysis");
        }

        const doc = await getDocument(params.documentId, auth.session.email);
        if (!doc) return Response.json({ error: "Document not found." }, { status: 404 });

        const extracted = await extractDocumentText(doc);
        if (extracted) {
          await updateDocument(doc.id, auth.session.email, {
            status: "indexed",
            indexedText: extracted,
          });
        }

        const analysis = await analyzeVaultDocument({ ...doc, indexedText: extracted || doc.indexedText });
        await updateDocument(doc.id, auth.session.email, { status: "analyzed", analysis });
        await trackUsage(auth.session.email, "analyze");

        await logPrivacyAudit(auth.memberId, {
          action: "ai_analyze",
          detail: `Analyzed vault document: ${doc.name}`,
          sessionId: doc.id,
        });

        if (!auth.session.isDemo) {
          await appendAiMemory(auth.memberId, auth.session.email, {
            type: "document_insight",
            content: `${doc.name} (${doc.category}): ${analysis.summary.slice(0, 400)}`,
            sourceId: doc.id,
          });
        }

        return Response.json({ analysis });
      },
    },
  },
});
