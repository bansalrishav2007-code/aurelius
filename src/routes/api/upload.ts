import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { addDocument } from "@/lib/vault/store.server";
import { trackUsage } from "@/lib/usage/store.server";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf"]);

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Expected multipart/form-data." }, { status: 400 });
        }

        const file = form.get("file");
        if (!(file instanceof File)) {
          return Response.json({ error: "Missing 'file' field." }, { status: 400 });
        }
        if (!ALLOWED.has(file.type)) {
          return Response.json({ error: "PDF only." }, { status: 415 });
        }
        if (file.size > MAX_BYTES) {
          return Response.json({ error: "File exceeds 20 MB limit." }, { status: 413 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const doc = await addDocument({
          memberEmail: auth.session.email,
          name: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
          fileBuffer: buffer,
        });

        await trackUsage(auth.session.email, "upload");

        return Response.json({
          documentId: doc.id,
          name: doc.name,
          category: doc.category,
          sizeBytes: doc.sizeBytes,
          status: doc.status,
          message: "Document encrypted and stored in your private vault.",
        });
      },
    },
  },
});
