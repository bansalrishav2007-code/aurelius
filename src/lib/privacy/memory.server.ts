import type { AiMemoryEntry, AiMemoryEntryType, UserAiMemory } from "./types";
import { logPrivacyAudit } from "./audit.server";
import { readUserEncryptedFile, writeUserEncryptedFile } from "./user-store.server";

const FILE = "ai-memory.enc";
const MAX_ENTRIES = 120;

function emptyMemory(memberId: string, memberEmail: string): UserAiMemory {
  return {
    memberId,
    memberEmail: memberEmail.toLowerCase(),
    entries: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function readAiMemory(memberId: string, memberEmail: string): Promise<UserAiMemory> {
  const memory = await readUserEncryptedFile<UserAiMemory>(
    memberId,
    FILE,
    emptyMemory(memberId, memberEmail),
  );
  if (memory.memberId !== memberId) {
    return emptyMemory(memberId, memberEmail);
  }
  return memory;
}

export async function appendAiMemory(
  memberId: string,
  memberEmail: string,
  input: {
    type: AiMemoryEntryType;
    content: string;
    sourceId?: string;
  },
): Promise<void> {
  const memory = await readAiMemory(memberId, memberEmail);
  memory.entries.unshift({
    id: `mem-${crypto.randomUUID()}`,
    type: input.type,
    content: input.content.trim().slice(0, 2000),
    sourceId: input.sourceId,
    createdAt: new Date().toISOString(),
  });
  memory.entries = memory.entries.slice(0, MAX_ENTRIES);
  memory.updatedAt = new Date().toISOString();
  await writeUserEncryptedFile(memberId, FILE, memory);
  await logPrivacyAudit(memberId, {
    action: "memory_write",
    detail: `Stored ${input.type} memory entry`,
    sessionId: input.sourceId,
  });
}

export async function deleteAllAiMemory(memberId: string, memberEmail: string): Promise<void> {
  await writeUserEncryptedFile(memberId, FILE, emptyMemory(memberId, memberEmail));
  await logPrivacyAudit(memberId, {
    action: "memory_delete",
    detail: "User cleared all AI memory",
  });
}

export function formatMemoryForPrompt(entries: AiMemoryEntry[]): string {
  if (entries.length === 0) return "";
  const recent = entries.slice(0, 24);
  return recent.map((e) => `- [${e.type}] ${e.content}`).join("\n");
}
