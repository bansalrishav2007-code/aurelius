export type EntityType = "company" | "llp" | "trust" | "partnership" | "huf" | "other";
export type EntityRole = "director" | "partner" | "trustee" | "shareholder" | "other";
export type ComplianceStatus = "compliant" | "due_soon" | "overdue";

export type TrackedLegalEntity = {
  id: string;
  memberEmail: string;
  name: string;
  entityType: EntityType;
  role: EntityRole;
  shareholdingPercent?: number;
  estimatedValuation?: number;
  rocFilingDue?: string;
  complianceStatus: ComplianceStatus;
  documentIds?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LegalEntitiesStore = {
  entities: TrackedLegalEntity[];
};
