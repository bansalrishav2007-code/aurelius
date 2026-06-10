import { createAureliusCompletion, isAureliusAiConfigured } from "@/lib/ai/router.server";
import { readDocumentFile } from "@/lib/vault/store.server";
import type { VaultDocument } from "@/lib/vault/types";
import type { ExtractionFieldConfidence, WealthDocumentType, WealthExtractionDraft } from "./types";

const PARSEABLE_MIME = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

async function readDocumentSnippet(doc: VaultDocument): Promise<string> {
  if (!PARSEABLE_MIME.has(doc.mimeType)) {
    return "";
  }

  try {
    const buffer = await readDocumentFile(doc);
    if (doc.mimeType === "text/csv") {
      return buffer.toString("utf-8").slice(0, 12_000);
    }
    // PDF / Excel: extract printable ASCII for lightweight parsing hints
    const ascii = buffer
      .toString("latin1")
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return ascii.slice(0, 12_000);
  } catch {
    return "";
  }
}

function normalizeDraft(raw: Record<string, unknown>, documentId: string, documentName: string): WealthExtractionDraft {
  const now = new Date().toISOString().slice(0, 10);

  const assets = Array.isArray(raw.assets)
    ? raw.assets
        .map((item) => {
          const row = item as Record<string, unknown>;
          const value = Number(row.value);
          if (!row.name || !Number.isFinite(value) || value <= 0) return null;
          return {
            name: String(row.name).trim(),
            category: (["equity", "real_estate", "gold", "cash_fd", "legal_entity", "other"].includes(
              String(row.category),
            )
              ? String(row.category)
              : "other") as WealthExtractionDraft["assets"][number]["category"],
            value,
            dateAdded: String(row.dateAdded ?? now),
            notes: row.notes ? String(row.notes) : undefined,
            aiExtracted: true,
            sourceDocumentId: documentId,
          };
        })
        .filter(Boolean)
    : [];

  const liabilities = Array.isArray(raw.liabilities)
    ? raw.liabilities
        .map((item) => {
          const row = item as Record<string, unknown>;
          const value = Number(row.value);
          if (!row.name || !Number.isFinite(value) || value <= 0) return null;
          return {
            name: String(row.name).trim(),
            type: (["loan", "mortgage", "credit"].includes(String(row.type))
              ? String(row.type)
              : "loan") as WealthExtractionDraft["liabilities"][number]["type"],
            value,
            dateAdded: String(row.dateAdded ?? now),
            notes: row.notes ? String(row.notes) : undefined,
            aiExtracted: true,
            sourceDocumentId: documentId,
          };
        })
        .filter(Boolean)
    : [];

  const legalEntities = Array.isArray(raw.legalEntities)
    ? raw.legalEntities
        .map((item) => {
          const row = item as Record<string, unknown>;
          if (!row.name) return null;
          const value = row.value != null ? Number(row.value) : undefined;
          return {
            name: String(row.name).trim(),
            entityType: row.entityType ? String(row.entityType) : undefined,
            value: Number.isFinite(value) ? value : undefined,
            notes: row.notes ? String(row.notes) : undefined,
            aiExtracted: true,
          };
        })
        .filter(Boolean)
    : [];

  const tax = raw.taxSnapshot as Record<string, unknown> | null | undefined;
  const taxSnapshot =
    tax && typeof tax === "object"
      ? {
          assessmentYear: tax.assessmentYear ? String(tax.assessmentYear) : undefined,
          totalIncome: tax.totalIncome != null ? Number(tax.totalIncome) : undefined,
          taxPaid: tax.taxPaid != null ? Number(tax.taxPaid) : undefined,
          refundDue: tax.refundDue != null ? Number(tax.refundDue) : undefined,
          notes: tax.notes ? String(tax.notes) : undefined,
          aiExtracted: true,
          updatedAt: new Date().toISOString(),
        }
      : null;

  const fieldConfidence: Record<string, ExtractionFieldConfidence> = {};
  const rawConfidence = raw.fieldConfidence as Record<string, string> | undefined;
  if (rawConfidence && typeof rawConfidence === "object") {
    for (const [k, v] of Object.entries(rawConfidence)) {
      if (v === "high" || v === "medium" || v === "low") fieldConfidence[k] = v;
    }
  }
  assets.forEach((a, i) => {
    if (!fieldConfidence[`asset.${i}.name`]) fieldConfidence[`asset.${i}.name`] = a ? "high" : "low";
    if (!fieldConfidence[`asset.${i}.value`]) fieldConfidence[`asset.${i}.value`] = a ? "high" : "low";
  });
  liabilities.forEach((l, i) => {
    if (!fieldConfidence[`liability.${i}.name`]) fieldConfidence[`liability.${i}.name`] = l ? "high" : "low";
    if (!fieldConfidence[`liability.${i}.value`]) fieldConfidence[`liability.${i}.value`] = l ? "high" : "low";
  });
  if (taxSnapshot && !fieldConfidence.taxSnapshot) {
    fieldConfidence.taxSnapshot =
      taxSnapshot.totalIncome != null || taxSnapshot.taxPaid != null ? "medium" : "low";
  }

  return {
    assets: assets as WealthExtractionDraft["assets"],
    liabilities: liabilities as WealthExtractionDraft["liabilities"],
    legalEntities: legalEntities as WealthExtractionDraft["legalEntities"],
    taxSnapshot,
    documentId,
    documentName,
    fieldConfidence: Object.keys(fieldConfidence).length ? fieldConfidence : undefined,
  };
}

export async function parseWealthDocument(input: {
  doc: VaultDocument;
  documentType: WealthDocumentType;
  pastedText?: string;
}): Promise<WealthExtractionDraft> {
  const snippet = input.pastedText?.trim() || (await readDocumentSnippet(input.doc));
  const documentId = input.doc.id;
  const documentName = input.doc.name;

  if (!isAureliusAiConfigured()) {
    return {
      assets: [],
      liabilities: [],
      legalEntities: [],
      taxSnapshot: {
        notes: "Aurelius AI document extraction is temporarily unavailable.",
        aiExtracted: false,
        updatedAt: new Date().toISOString(),
      },
      documentId,
      documentName,
    };
  }

  const prompt = `You are Aurelius wealth intelligence for Indian HNW principals. Parse this ${input.documentType} document and extract structured wealth data.

Document name: ${documentName}
Document type: ${input.documentType}
Content snippet (may be partial):
"""
${snippet || "No readable text extracted — infer conservatively from document type and filename only if obvious."}
"""

Return JSON only with this shape:
{
  "assets": [{ "name": string, "category": "equity"|"real_estate"|"gold"|"cash_fd"|"legal_entity"|"other", "value": number_in_inr, "dateAdded": "YYYY-MM-DD", "notes": string }],
  "liabilities": [{ "name": string, "type": "loan"|"mortgage"|"credit", "value": number_in_inr, "dateAdded": "YYYY-MM-DD", "notes": string }],
  "legalEntities": [{ "name": string, "entityType": string, "value": number_in_inr, "notes": string }],
  "taxSnapshot": { "assessmentYear": string, "totalIncome": number, "taxPaid": number, "refundDue": number, "notes": string },
  "fieldConfidence": { "asset.0.name": "high"|"medium"|"low", "asset.0.value": "high"|"medium"|"low", "taxSnapshot": "high"|"medium"|"low" }
}

Rules:
- Values must be INR numbers without currency symbols.
- Only include items you can reasonably infer from the snippet.
- If ITR, populate taxSnapshot when possible.
- If NSDL CAS or MF statement, focus on equity assets.
- If bank statement, focus on cash_fd.
- Do not invent political or unrelated data.
- Include fieldConfidence per extracted field: high if clearly read from document, medium if inferred, low if uncertain.`;

  const raw = await createAureliusCompletion({
    system:
      "You are Aurelius. Extract Indian private wealth data from documents. Respond with valid JSON only. Never mention AI providers.",
    messages: [{ role: "user", content: prompt }],
    feature: "document",
    memberEmail: input.doc.memberEmail,
    maxTokens: 2000,
  });

  try {
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")) as Record<string, unknown>;
    return normalizeDraft(parsed, documentId, documentName);
  } catch {
    return {
      assets: [],
      liabilities: [],
      legalEntities: [],
      taxSnapshot: {
        notes: "AI could not structure this document. Add entries manually.",
        aiExtracted: false,
        updatedAt: new Date().toISOString(),
      },
      documentId,
      documentName,
    };
  }
}
