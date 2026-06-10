export type PrivacyAuditAction =
  | "ai_chat"
  | "ai_analyze"
  | "ai_wealth_parse"
  | "ai_intelligence"
  | "memory_read"
  | "memory_write"
  | "memory_delete";

export type PrivacyAuditEntry = {
  id: string;
  timestamp: string;
  action: PrivacyAuditAction;
  detail: string;
  sessionId?: string;
};

export type AiMemoryEntryType =
  | "conversation_summary"
  | "wealth_snapshot"
  | "goal_note"
  | "preference"
  | "document_insight";

export type AiMemoryEntry = {
  id: string;
  type: AiMemoryEntryType;
  content: string;
  sourceId?: string;
  createdAt: string;
};

export type UserAiMemory = {
  memberId: string;
  memberEmail: string;
  entries: AiMemoryEntry[];
  updatedAt: string;
};

export type UserPrivateContext = {
  memberId: string;
  memberEmail: string;
  fullName: string;
  profession?: string;
  firm?: string;
  wealth: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    allocation: { category: string; label: string; value: number; percent: number }[];
    assets?: { name: string; value: number; category: string }[];
    liabilities?: { name: string; amount: number; type?: string }[];
    taxSnapshot?: {
      assessmentYear?: string;
      totalIncome?: number;
      taxPaid?: number;
      taxPayable?: number;
      regime?: string;
      used80C?: number;
      tdsPaid?: number;
    } | null;
    legalEntities: { name: string; entityType?: string; role?: string; value?: number }[];
  } | null;
  goals: {
    id: string;
    title: string;
    description?: string;
    status: string;
    targetAmount?: number;
    targetDate?: string;
  }[];
  memory: AiMemoryEntry[];
  recentConversations: { id: string; title: string; preview?: string }[];
  documents: { id: string; name: string; category: string }[];
  healthScore?: { score: number; bandLabel: string } | null;
  alerts?: string[];
  intelligenceBrief?: string | null;
};
