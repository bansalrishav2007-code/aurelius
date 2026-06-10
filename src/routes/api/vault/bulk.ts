import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import {
  deleteDocuments,
  getDocument,
  readDocumentFile,
  updateDocument,
} from "@/lib/vault/store.server";
import type { DocumentCategory } from "@/lib/vault/types";
import { VAULT_UPLOAD_CATEGORIES } from "@/lib/vault/categories";

export const Route = createFileRoute("/api/vault/bulk")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Bulk vault actions");
        }

        const body = (await request.json().catch(() => ({}))) as {
          action?: "delete" | "move" | "download";
          documentIds?: string[];
          category?: DocumentCategory;
        };

        const ids = body.documentIds?.filter(Boolean) ?? [];
        if (!ids.length) {
          return Response.json({ error: "documentIds required." }, { status: 400 });
        }

        if (body.action === "delete") {
          const result = await deleteDocuments(ids, auth.session.email);
          return Response.json(result);
        }

        if (body.action === "move") {
          if (!body.category || !(VAULT_UPLOAD_CATEGORIES as readonly string[]).includes(body.category)) {
            return Response.json({ error: "Valid category required." }, { status: 400 });
          }
          const moved: string[] = [];
          for (const id of ids) {
            const ok = await updateDocument(id, auth.session.email, { category: body.category });
            if (ok) moved.push(id);
          }
          return Response.json({ moved, category: body.category });
        }

        if (body.action === "download") {
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();
          let added = 0;

          for (const id of ids) {
            const doc = await getDocument(id, auth.session.email);
            if (!doc) continue;
            try {
              const buffer = await readDocumentFile(doc);
              const safeName = doc.name.replace(/[/\\?%*:|"<>]/g, "-");
              zip.file(safeName, buffer);
              added++;
            } catch {
              /* skip missing files */
            }
          }

          if (!added) {
            return Response.json({ error: "No documents found to download." }, { status: 404 });
          }

          const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
          return new Response(zipBuffer, {
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="aurelius-vault-${Date.now()}.zip"`,
              "Content-Length": String(zipBuffer.length),
            },
          });
        }

        return Response.json({ error: "Invalid action." }, { status: 400 });
      },
    },
  },
});
