import type { PrivacyAuditAction, PrivacyAuditEntry } from "./types";
import { readUserEncryptedFile, writeUserEncryptedFile } from "./user-store.server";

const FILE = "privacy-audit.enc";
const MAX_ENTRIES = 200;

type AuditStore = { entries: PrivacyAuditEntry[] };

function emptyStore(): AuditStore {
  return { entries: [] };
}

export async function logPrivacyAudit(
  memberId: string,
  entry: {
    action: PrivacyAuditAction;
    detail: string;
    sessionId?: string;
  },
): Promise<void> {
  const store = await readUserEncryptedFile<AuditStore>(memberId, FILE, emptyStore());
  store.entries.unshift({
    id: `audit-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    action: entry.action,
    detail: entry.detail,
    sessionId: entry.sessionId,
  });
  store.entries = store.entries.slice(0, MAX_ENTRIES);
  await writeUserEncryptedFile(memberId, FILE, store);
}

export async function listPrivacyAudit(memberId: string): Promise<PrivacyAuditEntry[]> {
  const store = await readUserEncryptedFile<AuditStore>(memberId, FILE, emptyStore());
  return store.entries;
}

export async function clearPrivacyAudit(memberId: string): Promise<void> {
  await writeUserEncryptedFile(memberId, FILE, emptyStore());
}
