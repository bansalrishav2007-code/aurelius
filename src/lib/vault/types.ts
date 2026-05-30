export type DocumentCategory =
  | "ITR"
  | "Form 16"
  | "GST"
  | "Financials"
  | "Property"
  | "Legal"
  | "Remittance"
  | "Investments"
  | "Other";

export type DocumentAnalysis = {
  summary: string;
  plainEnglish: string;
  complianceConcerns: string[];
  discussionPoints: string[];
  keyFacts: string[];
  generatedAt: string;
};

export type VaultDocument = {
  id: string;
  memberEmail: string;
  name: string;
  category: DocumentCategory;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  status: "received" | "indexed" | "analyzed";
  analysis?: DocumentAnalysis;
};

export type VaultStore = {
  documents: VaultDocument[];
};
