import { displayCategory } from "@/lib/vault/categories";
import type { DocumentCategory, VaultDocument } from "@/lib/vault/types";

export type DocumentFilterTab =
  | "All"
  | "Tax Returns"
  | "Intelligence"
  | "Financials"
  | "Legal"
  | "Investments"
  | "Remittance"
  | "Analysed"
  | "Not Analysed";

export const DOCUMENT_FILTER_TABS: DocumentFilterTab[] = [
  "All",
  "Tax Returns",
  "Intelligence",
  "Financials",
  "Legal",
  "Investments",
  "Remittance",
  "Analysed",
  "Not Analysed",
];

const CATEGORY_GROUPS: Record<string, DocumentCategory[]> = {
  "Tax Returns": ["Tax Returns", "ITR", "Form 16", "GST"],
  Intelligence: ["Intelligence"],
  Financials: ["Financials", "Company Documents"],
  Legal: [
    "Legal Agreement",
    "Legal",
    "Will",
    "Will & Succession",
    "CA Letter",
    "Property Document",
    "Property",
    "Insurance Policy",
    "Insurance",
  ],
  Investments: ["Investment Statement", "Investments", "Share Certificate"],
  Remittance: ["Remittance"],
};

export type DocumentSortKey = "date-desc" | "date-asc" | "name" | "size" | "category";

export function documentMatchesFilter(doc: VaultDocument, tab: DocumentFilterTab): boolean {
  if (tab === "All") return true;
  if (tab === "Analysed") return doc.status === "analyzed";
  if (tab === "Not Analysed") return doc.status !== "analyzed";
  const group = CATEGORY_GROUPS[tab];
  return group ? group.includes(doc.category) : false;
}

export function sortDocuments(docs: VaultDocument[], sortBy: DocumentSortKey): VaultDocument[] {
  const list = [...docs];
  list.sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "size") return b.sizeBytes - a.sizeBytes;
    if (sortBy === "category") {
      return displayCategory(a.category).localeCompare(displayCategory(b.category));
    }
    if (sortBy === "date-asc") return a.uploadedAt.localeCompare(b.uploadedAt);
    return b.uploadedAt.localeCompare(a.uploadedAt);
  });
  return list;
}

export function isRecentlyAdded(uploadedAt: string): boolean {
  return Date.now() - new Date(uploadedAt).getTime() < 86_400_000;
}

export type DocumentDisplayStatus = "analysed" | "received" | "processing" | "failed" | "shared";

export function getDocumentDisplayStatus(doc: VaultDocument): DocumentDisplayStatus {
  if (doc.activeShareLink && !doc.activeShareLink.usedAt) return "shared";
  if (doc.status === "analyzed") {
    const summary = doc.analysis?.summary?.toLowerCase() ?? "";
    if (summary.includes("unavailable") || summary.includes("failed")) return "failed";
    return "analysed";
  }
  if (doc.status === "indexed") return "processing";
  return "received";
}
