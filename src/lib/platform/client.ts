import type { VaultDocument, VaultAskResult, ShareAudience } from "@/lib/vault/types";
import type { Conversation } from "@/lib/chat/conversations.server";
import type { DocumentAnalysis } from "@/lib/vault/types";
import type { PublicMember } from "@/lib/auth/types";

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

export function fetchVaultDocuments() {
  return api<{ documents: VaultDocument[] }>("/api/vault");
}

export function deleteVaultDocument(id: string) {
  return api<{ ok: true }>(`/api/vault/${id}`, { method: "DELETE" });
}

export function updateVaultCategory(id: string, category: VaultDocument["category"]) {
  return api<{ ok: true }>(`/api/vault/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ category }),
  });
}

export function updateVaultExpiry(
  id: string,
  expiryDate: string,
  expiryType?: VaultDocument["expiryType"],
) {
  return api<{ ok: true }>(`/api/vault/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ expiryDate, expiryType }),
  });
}

export function createVaultShareLink(id: string, audience: ShareAudience) {
  return api<{
    token: string;
    expiresAt: string;
    createdAt: string;
    audience: ShareAudience;
    viewOnly: boolean;
    url: string;
    fullUrl: string;
  }>(`/api/vault/${id}/share`, {
    method: "POST",
    body: JSON.stringify({ audience }),
  });
}

export function bulkDeleteVaultDocuments(documentIds: string[]) {
  return api<{ deleted: string[]; failed: string[] }>("/api/vault/bulk", {
    method: "POST",
    body: JSON.stringify({ action: "delete", documentIds }),
  });
}

export function bulkMoveVaultDocuments(documentIds: string[], category: VaultDocument["category"]) {
  return api<{ moved: string[]; category: string }>("/api/vault/bulk", {
    method: "POST",
    body: JSON.stringify({ action: "move", documentIds, category }),
  });
}

export async function bulkDownloadVaultDocuments(documentIds: string[]): Promise<Blob> {
  const res = await fetch("/api/vault/bulk", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "download", documentIds }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Download failed");
  }
  return res.blob();
}

export function askVaultAssistant(question: string) {
  return api<VaultAskResult>("/api/vault/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function analyzeDocument(id: string) {
  return api<{ analysis: DocumentAnalysis }>(`/api/documents/${id}/analyze`, { method: "POST" });
}

export function askDocumentQuestion(id: string, question: string) {
  return api<{ answer: string }>(`/api/documents/${id}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function vaultDocumentUrl(id: string, inline = false) {
  return `/api/vault/${id}${inline ? "?inline=1" : ""}`;
}

export type VaultUploadResult = {
  documentId: string;
  name: string;
  category: VaultDocument["category"];
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  status: VaultDocument["status"];
  needsCategory?: boolean;
  message?: string;
};

export function uploadVaultFile(
  file: File,
  opts?: { category?: string; onProgress?: (pct: number) => void },
): Promise<VaultUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    if (opts?.category) form.append("category", opts.category);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts?.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: VaultUploadResult & { error?: string } = {} as VaultUploadResult & { error?: string };
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Invalid server response"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.error ?? `Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed — network error"));
    xhr.open("POST", "/api/upload");
    xhr.withCredentials = true;
    xhr.send(form);
  });
}

export function fetchConversations() {
  return api<{ conversations: Conversation[] }>("/api/conversations");
}

export function createConversation(title?: string) {
  return api<{ conversation: Conversation }>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function fetchConversation(id: string) {
  return api<{ conversation: Conversation }>(`/api/conversations/${id}`);
}

export function deleteConversation(id: string) {
  return api<{ ok: true }>(`/api/conversations/${id}`, { method: "DELETE" });
}

export function exportChatConversation(messages: { role: "user" | "assistant"; content: string; createdAt?: string }[]) {
  return api<{ documentId: string; name: string }>("/api/member/chat/export", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
}

export function fetchChatContext() {
  return api<{
    netWorth: number;
    healthScore?: {
      score: number;
      bandLabel: string;
      bandColor?: string;
      downside?: string;
      topFix?: string;
      breakdown?: { label: string; points: number; max: number }[];
    };
    unused80CHeadroom?: number;
    alerts: { id: string; message: string; severity: string }[];
    intelligenceBrief?: { summary?: string; recommendations: { title: string; whatToDo: string }[]; updatedAt?: string } | null;
    updatedAt: string;
  }>("/api/member/chat/context");
}

export function fetchAdvisorTriggers() {
  return api<{ triggers: { id: string; severity: string; message: string; preloadMessage: string }[] }>(
    "/api/member/chat/triggers",
  );
}

export function generateConversationTitle(conversationId: string, message: string) {
  return api<{ conversation: Conversation; title: string }>(
    `/api/conversations/${conversationId}/title`,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
  );
}

export function saveConversationMessages(
  id: string,
  messages: { role: "user" | "assistant"; content: string }[],
  documentIds?: string[],
) {
  return api<{ conversation: Conversation }>(`/api/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ messages, documentIds }),
  });
}

export function requestPasswordReset(email: string) {
  return api<{ ok: true; message: string; devToken?: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return api<{ ok: true }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function fetchAdminUsage() {
  return api<{
    totalEvents: number;
    byMember: Record<string, { chat: number; upload: number; analyze: number }>;
    recent: { memberEmail: string; type: string; createdAt: string }[];
  }>("/api/admin/usage");
}

export function fetchAdminAiSettings() {
  return api<{
    settings: { primaryProvider: "claude" | "gpt" | "both"; updatedAt: string };
    costs: {
      todayCalls: number;
      todayCostUsd: number;
      monthClaudeUsd: number;
      monthGptUsd: number;
      monthCostUsd: number;
      avgResponseTimeMs: number;
      errorRate: number;
      rateLimitHits: number;
    };
  }>("/api/admin/ai-settings");
}

export function updateAdminAiProvider(primaryProvider: "claude" | "gpt" | "both") {
  return api<{ ok: true; settings: { primaryProvider: string; updatedAt: string } }>(
    "/api/admin/ai-settings",
    { method: "PATCH", body: JSON.stringify({ primaryProvider }) },
  );
}

export function revokeMemberAccess(memberId: string) {
  return api<{ ok: true }>(`/api/admin/members/${memberId}/revoke`, { method: "POST" });
}

export type { PublicMember };
