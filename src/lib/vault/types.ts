export type DocumentCategory =
  | "Tax Returns"
  | "Investment Statement"
  | "Property Document"
  | "Insurance Policy"
  | "Legal Agreement"
  | "Bank Statement"
  | "Bank Statements"
  | "Other"
  | "ITR"
  | "Form 16"
  | "GST"
  | "Financials"
  | "Property"
  | "Legal"
  | "Remittance"
  | "Investments"
  | "Intelligence"
  | "Share Certificate"
  | "Insurance"
  | "Will"
  | "Will & Succession"
  | "Company Documents"
  | "CA Letter";

export type ExpiryType = "insurance" | "passport" | "property_tax" | "other";

export type ShareAudience = "expert" | "family";

export type ShareAccessEntry = {
  accessedAt: string;
  audience: ShareAudience;
  userAgent?: string;
};

export type DocumentVersion = {
  id: string;
  name: string;
  uploadedAt: string;
  sizeBytes: number;
};

export type VaultShareLink = {
  token: string;
  expiresAt: string;
  createdAt: string;
  audience: ShareAudience;
  viewOnly: boolean;
  usedAt?: string;
  accessLog: ShareAccessEntry[];
};

export type DocumentAnalysisSections = {
  documentSummary: string;
  keyFigures: string;
  wealthImplications: string;
  actionItems: string;
};

export type DocumentAnalysis = {
  summary: string;
  plainEnglish: string;
  complianceConcerns: string[];
  discussionPoints: string[];
  keyFacts: string[];
  generatedAt: string;
  sections?: DocumentAnalysisSections;
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
  indexedText?: string;
  analysis?: DocumentAnalysis;
  searchKeywords?: string[];
  expiryDate?: string;
  expiryType?: ExpiryType;
  versions?: DocumentVersion[];
  activeShareLink?: VaultShareLink;
};

export type VaultStore = {
  documents: VaultDocument[];
};

export type VaultAskCitation = {
  documentId: string;
  documentName: string;
  excerpt: string;
};

export type VaultAskResult = {
  answer: string;
  citations: VaultAskCitation[];
};
