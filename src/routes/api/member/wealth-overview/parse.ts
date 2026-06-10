import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { logPrivacyAudit } from "@/lib/privacy/audit.server";
import { addDocument, getDocument } from "@/lib/vault/store.server";
import { parseWealthDocument } from "@/lib/wealth/parse-document.server";
import type { WealthDocumentType } from "@/lib/wealth/types";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const Route = createFileRoute("/api/member/wealth-overview/parse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Document parsing");
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Expected multipart/form-data." }, { status: 400 });
        }

        const documentType = form.get("documentType") as WealthDocumentType | null;
        const pastedText = String(form.get("pastedText") ?? "").trim();
        const existingId = String(form.get("documentId") ?? "").trim();

        if (!documentType) {
          return Response.json({ error: "Document type is required." }, { status: 400 });
        }

        let doc;
        if (existingId) {
          doc = await getDocument(existingId, auth.session.email);
          if (!doc) return Response.json({ error: "Document not found." }, { status: 404 });
        } else {
          const file = form.get("file");
          if (!(file instanceof File)) {
            return Response.json({ error: "Upload a file or provide documentId." }, { status: 400 });
          }
          if (!ALLOWED_MIME.has(file.type) && !file.name.match(/\.(pdf|csv|xlsx|xls)$/i)) {
            return Response.json({ error: "Supported formats: PDF, CSV, Excel." }, { status: 415 });
          }
          if (file.size > MAX_BYTES) {
            return Response.json({ error: "File exceeds 20 MB limit." }, { status: 413 });
          }

          const buffer = Buffer.from(await file.arrayBuffer());
          doc = await addDocument({
            memberEmail: auth.session.email,
            name: file.name,
            sizeBytes: file.size,
            mimeType: file.type || "application/pdf",
            fileBuffer: buffer,
          });
        }

        const draft = await parseWealthDocument({
          doc,
          documentType,
          pastedText: pastedText || undefined,
        });

        await logPrivacyAudit(auth.memberId, {
          action: "ai_wealth_parse",
          detail: `Parsed wealth document: ${doc.name} (${documentType})`,
          sessionId: doc.id,
        });

        return Response.json({ draft, document: { id: doc.id, name: doc.name } });
      },
    },
  },
});
