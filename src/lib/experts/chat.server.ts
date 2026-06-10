import { logPrivacyAudit } from "@/lib/privacy/audit.server";
import { buildClientWealthBriefForExpert } from "./brief.server";
import { getRelationForExpert } from "./relations.server";
import type { ExpertChatMessage, ExpertChatThread } from "./types";

type StoreAccessor = {
  read: () => Promise<{ chatThreads: ExpertChatThread[] }>;
  mutate: <T>(fn: (store: { chatThreads: ExpertChatThread[] }) => T) => Promise<T>;
};

let storeAccessor: StoreAccessor | null = null;

export function wireChatStore(accessor: StoreAccessor) {
  storeAccessor = accessor;
}

function getStore() {
  if (!storeAccessor) throw new Error("Expert chat store not wired.");
  return storeAccessor;
}

export async function getOrCreateThread(input: {
  expertId: string;
  memberEmail: string;
  memberName: string;
  memberId?: string;
}): Promise<ExpertChatThread> {
  const email = input.memberEmail.toLowerCase();
  const existingStore = await getStore().read();
  const existing = existingStore.chatThreads.find(
    (t) => t.expertId === input.expertId && t.memberEmail === email,
  );
  if (existing) return structuredClone(existing);

  const relation = await getRelationForExpert(input.expertId, email);
  let brief: string | undefined;
  if (relation?.vaultShareApproved) {
    brief = await buildClientWealthBriefForExpert(email, relation.mainConcern);
  }

  return getStore().mutate((store) => {
    const now = new Date().toISOString();
    const thread: ExpertChatThread = {
      id: `exchat-${crypto.randomUUID()}`,
      expertId: input.expertId,
      memberEmail: email,
      memberName: input.memberName,
      messages: [],
      wealthBriefForExpert: brief,
      createdAt: now,
      updatedAt: now,
    };
    store.chatThreads.push(thread);
    return structuredClone(thread);
  });
}

export async function listMemberExpertThreads(memberEmail: string): Promise<ExpertChatThread[]> {
  const store = await getStore().read();
  return store.chatThreads
    .filter((t) => t.memberEmail === memberEmail.toLowerCase())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function listExpertInbox(expertId: string): Promise<ExpertChatThread[]> {
  const store = await getStore().read();
  return store.chatThreads
    .filter((t) => t.expertId === expertId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getThreadForMember(
  threadId: string,
  memberEmail: string,
): Promise<ExpertChatThread | null> {
  const store = await getStore().read();
  const thread = store.chatThreads.find(
    (t) => t.id === threadId && t.memberEmail === memberEmail.toLowerCase(),
  );
  return thread ? structuredClone(thread) : null;
}

export async function getThreadForExpert(threadId: string, expertId: string): Promise<ExpertChatThread | null> {
  const store = await getStore().read();
  const thread = store.chatThreads.find((t) => t.id === threadId && t.expertId === expertId);
  if (!thread) return null;
  const relation = await getRelationForExpert(expertId, thread.memberEmail);
  const copy = structuredClone(thread);
  if (!relation?.vaultShareApproved) {
    copy.wealthBriefForExpert = undefined;
  }
  return copy;
}

export async function appendExpertChatMessage(input: {
  threadId: string;
  sender: "member" | "expert";
  memberEmail?: string;
  expertId?: string;
  content: string;
  documentIds?: string[];
  memberId?: string;
}): Promise<ExpertChatMessage | null> {
  return getStore().mutate((store) => {
    const thread = store.chatThreads.find((t) => {
      if (t.id !== input.threadId) return false;
      if (input.sender === "member") return t.memberEmail === input.memberEmail?.toLowerCase();
      return t.expertId === input.expertId;
    });
    if (!thread) return null;

    const msg: ExpertChatMessage = {
      id: `exmsg-${crypto.randomUUID()}`,
      sender: input.sender,
      content: input.content.trim(),
      documentIds: input.documentIds,
      createdAt: new Date().toISOString(),
    };
    thread.messages.push(msg);
    thread.updatedAt = msg.createdAt;
    return msg;
  }).then(async (msg) => {
    if (msg && input.memberId) {
      await logPrivacyAudit(input.memberId, {
        action: "ai_chat",
        detail: `Expert chat message sent in thread ${input.threadId}`,
        sessionId: input.threadId,
      });
    }
    return msg;
  });
}
