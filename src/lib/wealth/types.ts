export type AssetCategory =
  | "equity"
  | "real_estate"
  | "gold"
  | "cash_fd"
  | "legal_entity"
  | "other";

export type LiabilityType =
  | "home_loan"
  | "car_loan"
  | "personal_loan"
  | "business_loan"
  | "mortgage"
  | "credit_card"
  | "education_loan"
  | "other"
  | "loan"
  | "credit";

export type LiabilityPaymentType = "emi" | "part_payment" | "full_closure";

export type LiabilityPayment = {
  id: string;
  amount: number;
  date: string;
  type: LiabilityPaymentType;
  notes?: string;
};

export type CrossedMilestone = {
  amount: number;
  netWorthAtCrossing: number;
  crossedAt: string;
};

export type WealthDocumentType =
  | "itr"
  | "ca_statement"
  | "bank_statement"
  | "mf_statement"
  | "nsdl_cas"
  | "other";

export type AssetValueHistoryEntry = {
  value: number;
  at: string;
};

export type WealthAsset = {
  id: string;
  memberEmail: string;
  name: string;
  category: AssetCategory;
  value: number;
  originalValue?: number;
  valueHistory?: AssetValueHistoryEntry[];
  dateAdded: string;
  notes?: string;
  aiExtracted?: boolean;
  sourceDocumentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type WealthLiability = {
  id: string;
  memberEmail: string;
  name: string;
  type: LiabilityType;
  /** Outstanding balance */
  value: number;
  originalValue?: number;
  payments?: LiabilityPayment[];
  status?: "active" | "closed";
  dateAdded: string;
  notes?: string;
  aiExtracted?: boolean;
  sourceDocumentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ComplianceStatus = "compliant" | "due_soon" | "overdue";

export type LegalEntity = {
  id: string;
  memberEmail: string;
  name: string;
  entityType?: string;
  role?: string;
  shareholdingPercent?: number;
  value?: number;
  notes?: string;
  documentIds?: string[];
  rocFilingDue?: string;
  gstFilingDue?: string;
  itrFilingDue?: string;
  complianceStatus?: ComplianceStatus;
  aiExtracted?: boolean;
  updatedAt: string;
};

export type TaxSnapshot = {
  assessmentYear?: string;
  totalIncome?: number;
  taxPaid?: number;
  estimatedTaxFy?: number;
  stcg?: number;
  ltcg?: number;
  stcgTax?: number;
  ltcgTax?: number;
  used80C?: number;
  limit80C?: number;
  used80D?: number;
  limit80D?: number;
  refundDue?: number;
  notes?: string;
  aiExtracted?: boolean;
  updatedAt: string;
} | null;

export type PortfolioSnapshot = {
  at: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
};

export type WealthTimelineEventType =
  | "account_created"
  | "first_asset"
  | "asset_added"
  | "asset_updated"
  | "asset_deleted"
  | "liability_added"
  | "liability_deleted"
  | "loan_payment"
  | "loan_closed"
  | "milestone"
  | "document_uploaded"
  | "ai_brief_generated";

export type WealthTimelineEvent = {
  id: string;
  type: WealthTimelineEventType;
  at: string;
  label: string;
  description?: string;
  valueChange?: number;
  netWorthAfter?: number;
};

export type WealthAlert = {
  id: string;
  severity: "critical" | "warning" | "success";
  message: string;
  createdAt: string;
  meta?: Record<string, number>;
};

export type DismissedAlert = {
  alertId: string;
  dismissedAt: string;
};

export type NetWorthSnapshot = {
  month: string;
  netWorth: number;
};

export type WealthRecommendationCategory =
  | "allocation"
  | "tax"
  | "gold"
  | "legal_structure";

export type WealthRecommendation = {
  id: string;
  category: WealthRecommendationCategory;
  title: string;
  whatToDo: string;
  why: string;
  estimatedBenefitInr?: number;
  estimatedBenefitLabel?: string;
};

export type WealthIntelligenceReport = {
  id: string;
  preparedFor: string;
  preparedAt: string;
  status: "generating" | "ready" | "failed";
  summaryLine?: string;
  recommendations: WealthRecommendation[];
  vaultDocumentId?: string;
  pdfFileName?: string;
  errorMessage?: string;
};

export type MemberWealthProfile = {
  memberEmail: string;
  assets: WealthAsset[];
  liabilities: WealthLiability[];
  legalEntities: LegalEntity[];
  taxSnapshot: TaxSnapshot;
  intelligenceReport?: WealthIntelligenceReport | null;
  netWorthSnapshots?: NetWorthSnapshot[];
  portfolioSnapshots?: PortfolioSnapshot[];
  timelineEvents?: WealthTimelineEvent[];
  crossedMilestones?: CrossedMilestone[];
  accountCreatedAt?: string;
  dismissedAlerts?: DismissedAlert[];
  updatedAt: string;
};

export type WealthStore = {
  profiles: MemberWealthProfile[];
};

export type WealthAllocationSlice = {
  name: string;
  category: AssetCategory;
  value: number;
  percent: number;
  color: string;
};

export type HealthScoreSummary = {
  score: number;
  band: "needs_attention" | "moderate" | "healthy";
  bandLabel: string;
  bandColor: string;
  downside: string;
  topFix: string;
  breakdown?: { label: string; points: number; max: number }[];
};

export type WealthOverviewSummary = {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  allocation: WealthAllocationSlice[];
  profile: MemberWealthProfile;
  monthOverMonth?: {
    change: number;
    changePercent: number;
    direction: "up" | "down" | "flat";
  };
  healthScore?: HealthScoreSummary;
  alerts?: WealthAlert[];
};

export type ExtractionFieldConfidence = "high" | "medium" | "low";

export type WealthExtractionDraft = {
  assets: Omit<WealthAsset, "id" | "memberEmail" | "createdAt" | "updatedAt">[];
  liabilities: Omit<WealthLiability, "id" | "memberEmail" | "createdAt" | "updatedAt">[];
  legalEntities: Omit<LegalEntity, "id" | "memberEmail" | "updatedAt">[];
  taxSnapshot: TaxSnapshot;
  documentId?: string;
  documentName?: string;
  fieldConfidence?: Record<string, ExtractionFieldConfidence>;
};
