import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { deleteDocument, updateDocument } from "@/lib/vault/store.server";
import type { DocumentCategory } from "@/lib/vault/types";

export const Route = createFileRoute("/api/vault/$documentId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as { category?: DocumentCategory };
        if (!body.category) {
          return Response.json({ error: "category is required." }, { status: 400 });
        }

        const ok = await updateDocument(params.documentId, auth.session.email, { category: body.category });
        if (!ok) return Response.json({ error: "Document not found." }, { status: 404 });
        return Response.json({ ok: true });
      },
      DELETE: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const ok = await deleteDocument(params.documentId, auth.session.email);
        if (!ok) return Response.json({ error: "Document not found." }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
