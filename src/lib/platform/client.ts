import type { VaultDocument } from "@/lib/vault/types";
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

export function analyzeDocument(id: string) {
  return api<{ analysis: DocumentAnalysis }>(`/api/documents/${id}/analyze`, { method: "POST" });
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

export function revokeMemberAccess(memberId: string) {
  return api<{ ok: true }>(`/api/admin/members/${memberId}/revoke`, { method: "POST" });
}

export type { PublicMember };
