import type { AuditEvent } from "@/lib/audit/store.server";
import type { PrivacyAuditEntry } from "@/lib/privacy/types";
import type { ApiAccessEntry } from "./types";

const AUDIT_LABELS: Partial<Record<AuditEvent["action"], string>> = {
  login: "Sign-in",
  logout: "Sign-out",
  export: "Data export",
  create: "Data created",
  update: "Data updated",
  delete: "Data deleted",
  access_denied: "Access denied",
};

function formatAuditEvent(event: AuditEvent): ApiAccessEntry | null {
  const detail = event.detail.toLowerCase();
  let feature = AUDIT_LABELS[event.action] ?? event.resourceType;

  if (detail.includes("vault") || event.resourceType === "document") {
    feature = "Vault";
    return {
      id: event.id,
      feature: "AI Advisor accessed vault",
      detail: event.detail,
      accessedAt: event.createdAt,
    };
  }
  if (detail.includes("tax") || detail.includes("income")) {
    return {
      id: event.id,
      feature: "Tax Calculator read income data",
      detail: event.detail,
      accessedAt: event.createdAt,
    };
  }
  if (detail.includes("expert") || detail.includes("brief")) {
    return {
      id: event.id,
      feature: "Expert viewed your brief",
      detail: event.detail,
      accessedAt: event.createdAt,
    };
  }
  if (detail.includes("analyz") || detail.includes("document")) {
    return {
      id: event.id,
      feature: "AI document analysis",
      detail: event.detail,
      accessedAt: event.createdAt,
    };
  }

  return {
    id: event.id,
    feature,
    detail: event.detail,
    accessedAt: event.createdAt,
  };
}

function formatPrivacyEvent(entry: PrivacyAuditEntry): ApiAccessEntry {
  const labels: Record<string, string> = {
    ai_chat: "AI Advisor",
    ai_analyze: "AI document analysis",
    ai_memory_read: "AI memory accessed",
    ai_memory_write: "AI memory updated",
    data_export: "Privacy data export",
  };
  return {
    id: entry.id,
    feature: labels[entry.action] ?? "AI privacy",
    detail: entry.detail,
    accessedAt: entry.timestamp,
  };
}

export function buildApiAccessLog(
  auditEvents: AuditEvent[],
  privacyEvents: PrivacyAuditEntry[],
): ApiAccessEntry[] {
  const fromAudit = auditEvents
    .map(formatAuditEvent)
    .filter((e): e is ApiAccessEntry => e !== null);
  const fromPrivacy = privacyEvents.map(formatPrivacyEvent);
  return [...fromAudit, ...fromPrivacy]
    .sort((a, b) => b.accessedAt.localeCompare(a.accessedAt))
    .slice(0, 20);
}
