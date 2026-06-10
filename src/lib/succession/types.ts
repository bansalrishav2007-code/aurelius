export type WillStatus = "yes" | "no" | "in_progress";

export type SuccessionMember = {
  id: string;
  name: string;
  relation: string;
  assignedAssetIds: string[];
};

export type SuccessionPlan = {
  memberEmail: string;
  familyTree: SuccessionMember[];
  willStatus: WillStatus;
  willUpdatedAt?: string;
  willVaultDocumentId?: string;
  hasFamilyTrust: boolean;
  trustDetails?: string;
  trustVaultDocumentId?: string;
  aiRecommendation?: string;
  updatedAt: string;
};

export type SuccessionStore = {
  plans: SuccessionPlan[];
};
