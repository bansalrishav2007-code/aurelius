import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { addDocument, inferCategory } from "@/lib/vault/store.server";
import type { DocumentCategory } from "@/lib/vault/types";
import { VAULT_UPLOAD_CATEGORIES } from "@/lib/vault/categories";
import { trackUsage } from "@/lib/usage/store.server";

const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function resolveMime(file: File): string | null {
  if (ALLOWED_MIME.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && EXT_MIME[ext]) return EXT_MIME[ext];
  return null;
}

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Vault uploads");
        }

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

        const mimeType = resolveMime(file);
        if (!mimeType) {
          return Response.json(
            { error: "Unsupported file type. Upload PDF, JPG, PNG, XLSX, or DOCX." },
            { status: 415 },
          );
        }
        if (file.size > MAX_BYTES) {
          return Response.json({ error: "File exceeds 20 MB limit." }, { status: 413 });
        }

        const categoryRaw = form.get("category");
        let category: DocumentCategory | undefined;
        if (typeof categoryRaw === "string" && categoryRaw.trim()) {
          const trimmed = categoryRaw.trim() as DocumentCategory;
          if ((VAULT_UPLOAD_CATEGORIES as readonly string[]).includes(trimmed)) {
            category = trimmed;
          }
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const doc = await addDocument({
          memberEmail: auth.session.email,
          name: file.name,
          category: category ?? inferCategory(file.name),
          sizeBytes: file.size,
          mimeType,
          fileBuffer: buffer,
        });

        await trackUsage(auth.session.email, "upload");

        return Response.json({
          documentId: doc.id,
          name: doc.name,
          category: doc.category,
          sizeBytes: doc.sizeBytes,
          mimeType: doc.mimeType,
          uploadedAt: doc.uploadedAt,
          status: doc.status,
          needsCategory: !categoryRaw,
          message: "Document encrypted and stored in your private vault.",
        });
      },
    },
  },
});
