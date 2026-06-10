import type { EnrichedGoal, MemberGoal } from "@/lib/goals/types";
import type { FamilyMember } from "@/lib/family/types";
import type { SuccessionPlan } from "@/lib/succession/types";
import type { TrackedLegalEntity } from "@/lib/legal-entities/types";
import type {
  LoginHistoryEntry,
  SecurityDashboard,
  SecurityNotificationPrefs,
  SecurityProfile,
  SecuritySession,
  TrustedDevice,
} from "@/lib/security/types";
import type { SupportTicket } from "@/lib/support/types";
import type { PublicSession } from "@/lib/auth/types";
import type { WealthExtractionDraft, WealthOverviewSummary } from "@/lib/wealth/types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data;
}

export type MemberOverview = {
  session: PublicSession;
  member: {
    createdAt: string;
    expiresAt: string;
    subscription: string;
    subscriptionPlan?: string;
  } | null;
  stats: {
    documentCount: number;
    conversationCount: number;
    activeGoals: number;
    openTickets: number;
  };
  recentDocuments: {
    id: string;
    name: string;
    category: string;
    uploadedAt: string;
    status: string;
  }[];
  recentConversations: {
    id: string;
    title: string;
    updatedAt: string;
    messageCount: number;
  }[];
  activeGoals: MemberGoal[];
  wealth: {
    allocation: { name: string; value: number; color: string }[];
    liabilityTrend: { m: string; projected: number; optimised: number }[];
    hasData: boolean;
  };
  wealthSummary?: {
    netWorth: number;
    healthScore: number;
    healthLabel: string;
    updatedAt: string;
    hasData: boolean;
  };
  marketSnapshot?: {
    sensex: { value: string; changePercent: number | null };
    nifty: { value: string; changePercent: number | null };
    gold: { value: string; changePercent: number | null };
  };
  intelligenceSnippet?: string | null;
};

export function fetchMemberOverview() {
  return api<MemberOverview>("/api/member/overview");
}

export function fetchMemberProfile() {
  return api<{ profile: MemberOverview["member"] & { email: string; fullName: string; tier: string } }>(
    "/api/member/profile",
  );
}

export function updateMemberProfile(fullName: string) {
  return api<{ ok: true; session: PublicSession }>("/api/member/profile", {
    method: "PATCH",
    body: JSON.stringify({ fullName }),
  });
}

export function fetchMarketIntel(opts?: { newsFilter?: string; refreshBrief?: boolean }) {
  const params = new URLSearchParams();
  if (opts?.newsFilter) params.set("newsFilter", opts.newsFilter);
  if (opts?.refreshBrief) params.set("refreshBrief", "1");
  const qs = params.toString();
  return api<{
    news: import("@/lib/market/types").MarketNewsItem[];
    newsConfigured: boolean;
    featured: import("@/lib/market/types").MarketNewsItem | null;
    indicators: import("@/lib/market/types").MacroIndicator[];
    indicatorsAt: string;
    brief: import("@/lib/market/types").MarketBrief;
    relevance: import("@/lib/market/types").RelevanceCard[];
  }>(`/api/market-intel${qs ? `?${qs}` : ""}`);
}

export function regenerateMarketBrief() {
  return api<{ brief: import("@/lib/market/types").MarketBrief }>("/api/market-intel/brief", {
    method: "POST",
  });
}

export function saveMarketBookmark(body: {
  headline: string;
  url: string;
  source?: string;
  description?: string;
}) {
  return api<{ ok: true }>("/api/market-intel/bookmark", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function saveMarketBriefToVault(briefContent: string) {
  return api<{ ok: true }>("/api/market-intel/bookmark", {
    method: "POST",
    body: JSON.stringify({ briefContent }),
  });
}

export function fetchMemberGoals() {
  return api<{ goals: EnrichedGoal[]; updatedAt?: string }>("/api/member/goals");
}

export function createMemberGoal(body: {
  title: string;
  description?: string;
  category?: import("@/lib/goals/categories").GoalCategory;
  targetDate?: string;
  targetAmount?: number;
  currentAmount?: number;
  priority?: "high" | "medium" | "low";
}) {
  return api<{ goal: EnrichedGoal }>("/api/member/goals", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function adviseOnGoal(goalId: string) {
  return api<{ advice: import("@/lib/goals/types").GoalAiAdvice }>(
    `/api/member/goals/${goalId}/advise`,
    { method: "POST" },
  );
}

export function askGoalQuestion(goalId: string, question: string) {
  return api<{ answer: string }>(`/api/member/goals/${goalId}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function updateMemberGoal(
  goalId: string,
  body: {
    title?: string;
    description?: string;
    category?: import("@/lib/goals/categories").GoalCategory;
    targetDate?: string;
    targetAmount?: number;
    currentAmount?: number;
    priority?: "high" | "medium" | "low";
    status?: "active" | "completed";
  },
) {
  return api<{ goal: MemberGoal }>(`/api/member/goals/${goalId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function fetchFamilyMembers() {
  return api<{
    members: FamilyMember[];
    familyNetWorth: number;
    aiInsights: string[];
    updatedAt?: string;
  }>("/api/member/family");
}

export function upsertFamilyMember(body: {
  id?: string;
  name: string;
  relation: string;
  pan?: string;
  dob?: string;
  accessLevel?: "view" | "full";
  unused80CLimit?: number;
}) {
  return api<{ member: FamilyMember }>("/api/member/family", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteFamilyMember(id: string) {
  return api<{ ok: true }>(`/api/member/family?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchSuccessionPlan() {
  return api<{ plan: SuccessionPlan }>("/api/member/succession");
}

export function saveSuccessionPlan(plan: Partial<SuccessionPlan>) {
  return api<{ plan: SuccessionPlan }>("/api/member/succession", {
    method: "PUT",
    body: JSON.stringify(plan),
  });
}

export function fetchLegalEntities() {
  return api<{ entities: TrackedLegalEntity[]; aiFlags: string[]; updatedAt?: string }>(
    "/api/member/legal-entities",
  );
}

export function upsertLegalEntity(body: {
  id?: string;
  name: string;
  entityType: TrackedLegalEntity["entityType"];
  role: TrackedLegalEntity["role"];
  shareholdingPercent?: number;
  estimatedValuation?: number;
  rocFilingDue?: string;
  notes?: string;
}) {
  return api<{ entity: TrackedLegalEntity; aiFlags: string[] }>("/api/member/legal-entities", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteLegalEntity(id: string) {
  return api<{ ok: true }>(`/api/member/legal-entities?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchSecurityDashboard() {
  return api<SecurityDashboard>("/api/member/security");
}

export function patchSecuritySettings(body: {
  action:
    | "revoke_session"
    | "revoke_all_sessions"
    | "start_authenticator_setup"
    | "confirm_authenticator_setup"
    | "enable_sms_2fa"
    | "disable_2fa"
    | "trust_device"
    | "remove_trusted_device"
    | "request_deletion"
    | "confirm_deletion"
    | "acknowledge_suspicious"
    | "mark_history_reviewed"
    | "update_notification_prefs"
    | "change_password"
    | "emergency_lock";
  sessionId?: string;
  code?: string;
  mobile?: string;
  deviceId?: string;
  token?: string;
  skipOtpDays?: number;
  secure?: boolean;
  method?: "sms" | "authenticator";
  currentPassword?: string;
  newPassword?: string;
  notificationPrefs?: Partial<SecurityNotificationPrefs>;
}) {
  return api<{
    ok?: true;
    revoked?: number;
    secured?: boolean;
    locked?: boolean;
    profile?: SecurityProfile;
    notificationPrefs?: SecurityNotificationPrefs;
    backupCodes?: string[];
    secret?: string;
    otpauthUrl?: string;
    qrCodeUrl?: string;
    device?: TrustedDevice;
    emailSent?: boolean;
    devToken?: string;
  }>("/api/member/security", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function exportMemberData(): Promise<void> {
  const res = await fetch("/api/member/security/export", { credentials: "include" });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `aurelius-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function deleteMemberGoal(goalId: string) {
  return api<{ ok: true }>(`/api/member/goals/${goalId}`, { method: "DELETE" });
}

export function fetchMemberSupport() {
  return api<{ tickets: SupportTicket[] }>("/api/member/support");
}

export function createMemberSupportTicket(body: { subject: string; message: string }) {
  return api<{ ticket: SupportTicket }>("/api/member/support", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchWealthOverview() {
  return api<WealthOverviewSummary>("/api/member/wealth-overview");
}

export function addWealthAssetEntry(body: {
  name: string;
  category: string;
  value: number;
  dateAdded?: string;
  notes?: string;
}) {
  return api<WealthOverviewSummary>("/api/member/wealth-overview", {
    method: "POST",
    body: JSON.stringify({ action: "add_asset", ...body }),
  });
}

export function addWealthLiabilityEntry(body: {
  name: string;
  type: string;
  value: number;
  originalValue?: number;
  dateAdded?: string;
  notes?: string;
}) {
  return api<WealthOverviewSummary>("/api/member/wealth-overview", {
    method: "POST",
    body: JSON.stringify({ action: "add_liability", ...body }),
  });
}

export function confirmWealthExtraction(draft: WealthExtractionDraft) {
  return api<WealthOverviewSummary>("/api/member/wealth-overview", {
    method: "POST",
    body: JSON.stringify({ action: "confirm_extraction", draft }),
  });
}

export function deleteWealthAssetEntry(id: string) {
  return api<WealthOverviewSummary>("/api/member/wealth-overview", {
    method: "POST",
    body: JSON.stringify({ action: "delete_asset", id }),
  });
}

export function updateWealthAssetValue(id: string, value: number) {
  return api<WealthOverviewSummary>("/api/member/wealth-overview", {
    method: "POST",
    body: JSON.stringify({ action: "update_asset_value", id, value }),
  });
}

export function recordLiabilityPayment(
  id: string,
  body: {
    amount: number;
    date: string;
    type: string;
    notes?: string;
  },
) {
  return api<WealthOverviewSummary>("/api/member/wealth-overview", {
    method: "POST",
    body: JSON.stringify({
      action: "record_liability_payment",
      id,
      value: body.amount,
      date: body.date,
      paymentType: body.type,
      notes: body.notes,
    }),
  });
}

export function updateWealthLiabilityValue(id: string, value: number) {
  return api<WealthOverviewSummary>("/api/member/wealth-overview", {
    method: "POST",
    body: JSON.stringify({ action: "update_liability_value", id, value }),
  });
}

export function dismissWealthAlert(alertId: string) {
  return api<WealthOverviewSummary>("/api/member/wealth-overview", {
    method: "POST",
    body: JSON.stringify({ action: "dismiss_alert", alertId }),
  });
}

export function addWealthLegalEntity(entity: {
  name: string;
  entityType?: string;
  role?: string;
  shareholdingPercent?: number;
  value?: number;
  rocFilingDue?: string;
}) {
  return api<WealthOverviewSummary>("/api/member/wealth-overview", {
    method: "POST",
    body: JSON.stringify({ action: "add_legal_entity", entity }),
  });
}

export async function downloadIntelligenceBrief(): Promise<void> {
  const res = await fetch("/api/member/wealth-overview/brief-download", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const fileName = match?.[1] ?? `Aurelius_Brief_${new Date().toISOString().slice(0, 10)}.pdf`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function parseWealthDocumentUpload(form: FormData) {
  const res = await fetch("/api/member/wealth-overview/parse", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    draft?: WealthExtractionDraft;
    document?: { id: string; name: string };
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? `Parse failed (${res.status})`);
  return data;
}

export function fetchPrivacyAudit() {
  return api<{ entries: import("@/lib/privacy/types").PrivacyAuditEntry[] }>("/api/member/privacy/audit");
}

export function fetchAiMemoryStatus() {
  return api<{ entryCount: number; updatedAt: string }>("/api/member/privacy/memory");
}

export function deleteAiMemory() {
  return api<{ ok: true }>("/api/member/privacy/memory", { method: "DELETE" });
}

export function completeMemberOnboarding(body: {
  fullName?: string;
  profession?: string;
  firm?: string;
  goals?: { title: string; description?: string; targetDate?: string }[];
}) {
  return api<{ ok: true; session: PublicSession }>("/api/member/onboarding", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
