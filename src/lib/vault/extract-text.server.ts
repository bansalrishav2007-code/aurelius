import { readDocumentFile } from "./store.server";
import type { VaultDocument } from "./types";

const TEXT_MIME = new Set([
  "application/pdf",
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function isTextExtractable(mimeType: string): boolean {
  return TEXT_MIME.has(mimeType);
}

function maskSensitiveNumbers(text: string): string {
  return text.replace(/\b(\d{4})\d{4,}(\d{4})\b/g, "$1****$2");
}

/** Lightweight text extraction — PDF/Office via printable ASCII; images return empty. */
export async function extractDocumentText(doc: VaultDocument, maxChars = 18_000): Promise<string> {
  if (doc.indexedText) {
    return doc.indexedText.slice(0, maxChars);
  }

  if (!isTextExtractable(doc.mimeType)) {
    return "";
  }

  try {
    const buffer = await readDocumentFile(doc);
    let raw = "";

    if (doc.mimeType === "text/csv" || doc.mimeType === "text/plain") {
      raw = buffer.toString("utf-8");
    } else {
      raw = buffer
        .toString("latin1")
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    return maskSensitiveNumbers(raw.slice(0, maxChars));
  } catch (err) {
    console.error("[Vault] Text extraction failed:", doc.id, err);
    return "";
  }
}
