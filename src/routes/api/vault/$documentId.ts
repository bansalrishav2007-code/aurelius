import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import {
  deleteDocument,
  getDocument,
  readDocumentFile,
  updateDocument,
} from "@/lib/vault/store.server";
import type { DocumentCategory } from "@/lib/vault/types";
import { VAULT_UPLOAD_CATEGORIES } from "@/lib/vault/categories";

export const Route = createFileRoute("/api/vault/$documentId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const doc = await getDocument(params.documentId, auth.session.email);
        if (!doc) {
          return Response.json({ error: "Document not found." }, { status: 404 });
        }

        try {
          const buffer = await readDocumentFile(doc);
          const url = new URL(request.url);
          const inline = url.searchParams.get("inline") === "1";
          const disposition = inline ? "inline" : "attachment";
          return new Response(buffer, {
            headers: {
              "Content-Type": doc.mimeType,
              "Content-Disposition": `${disposition}; filename="${doc.name.replace(/"/g, "")}"`,
              "Content-Length": String(buffer.length),
            },
          });
        } catch {
          return Response.json({ error: "File not found on disk." }, { status: 404 });
        }
      },
      PATCH: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Document editing");
        }

        const body = (await request.json().catch(() => ({}))) as {
          category?: DocumentCategory;
          expiryDate?: string;
          expiryType?: import("@/lib/vault/types").ExpiryType;
        };

        const patch: Parameters<typeof updateDocument>[2] = {};
        if (body.category) {
          if (!(VAULT_UPLOAD_CATEGORIES as readonly string[]).includes(body.category)) {
            return Response.json({ error: "Invalid category." }, { status: 400 });
          }
          patch.category = body.category;
        }
        if (body.expiryDate) patch.expiryDate = body.expiryDate;
        if (body.expiryType) patch.expiryType = body.expiryType;

        if (!Object.keys(patch).length) {
          return Response.json({ error: "category or expiryDate required." }, { status: 400 });
        }

        const ok = await updateDocument(params.documentId, auth.session.email, patch);
        if (!ok) return Response.json({ error: "Document not found." }, { status: 404 });
        return Response.json({ ok: true });
      },
      DELETE: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Document deletion");
        }

        const ok = await deleteDocument(params.documentId, auth.session.email);
        if (!ok) return Response.json({ error: "Document not found." }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
