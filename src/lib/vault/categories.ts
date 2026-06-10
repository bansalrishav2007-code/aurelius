import type { DocumentCategory } from "./types";

/** Categories shown in the upload tagging modal. */
export const VAULT_UPLOAD_CATEGORIES = [
  "ITR",
  "GST",
  "Tax Returns",
  "Investment Statement",
  "Company Documents",
  "Property Document",
  "Insurance Policy",
  "Will & Succession",
  "Legal Agreement",
  "Bank Statements",
  "Intelligence",
  "Other",
] as const;

export type VaultUploadCategory = (typeof VAULT_UPLOAD_CATEGORIES)[number];

export type VaultFilterTab =
  | "All"
  | "Tax"
  | "Investments"
  | "Property"
  | "Insurance"
  | "Legal"
  | "Bank Statements"
  | "Intelligence";

export const VAULT_FILTER_TABS: VaultFilterTab[] = [
  "All",
  "Tax",
  "Investments",
  "Property",
  "Insurance",
  "Legal",
  "Bank Statements",
  "Intelligence",
];

const TAX_CATEGORIES = new Set<DocumentCategory>([
  "Tax Returns",
  "ITR",
  "Form 16",
  "GST",
]);

const INVESTMENT_CATEGORIES = new Set<DocumentCategory>([
  "Investment Statement",
  "Investments",
  "Share Certificate",
  "Financials",
  "Company Documents",
]);

const PROPERTY_CATEGORIES = new Set<DocumentCategory>(["Property Document", "Property"]);

const INSURANCE_CATEGORIES = new Set<DocumentCategory>(["Insurance Policy", "Insurance"]);

const LEGAL_CATEGORIES = new Set<DocumentCategory>([
  "Legal Agreement",
  "Legal",
  "Will",
  "Will & Succession",
  "CA Letter",
  "Remittance",
]);

const BANK_CATEGORIES = new Set<DocumentCategory>(["Bank Statement", "Bank Statements"]);

const INTELLIGENCE_CATEGORIES = new Set<DocumentCategory>(["Intelligence"]);

export function categoryMatchesFilter(
  category: DocumentCategory,
  tab: VaultFilterTab,
): boolean {
  if (tab === "All") return true;
  if (tab === "Tax") return TAX_CATEGORIES.has(category);
  if (tab === "Investments") return INVESTMENT_CATEGORIES.has(category);
  if (tab === "Property") return PROPERTY_CATEGORIES.has(category);
  if (tab === "Insurance") return INSURANCE_CATEGORIES.has(category);
  if (tab === "Legal") return LEGAL_CATEGORIES.has(category);
  if (tab === "Bank Statements") return BANK_CATEGORIES.has(category);
  if (tab === "Intelligence") return INTELLIGENCE_CATEGORIES.has(category);
  return true;
}

const LEGACY_DISPLAY: Partial<Record<DocumentCategory, string>> = {
  ITR: "ITR",
  "Form 16": "Tax Returns",
  GST: "GST",
  Investments: "Investment Statement",
  "Share Certificate": "Investment Statement",
  Financials: "Company Documents",
  Property: "Property Document",
  Insurance: "Insurance Policy",
  Legal: "Legal Agreement",
  Will: "Will & Succession",
  "CA Letter": "Legal Agreement",
  Remittance: "Legal Agreement",
  "Bank Statement": "Bank Statements",
};

export function displayCategory(category: DocumentCategory): string {
  return LEGACY_DISPLAY[category] ?? category;
}
