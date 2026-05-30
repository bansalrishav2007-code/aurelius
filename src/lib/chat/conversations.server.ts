import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  memberEmail: string;
  title: string;
  messages: ChatMessage[];
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
};

type ConversationStore = {
  conversations: Conversation[];
};

const DATA_PATH = join(process.cwd(), ".data", "aureliuss-conversations.json");
let memoryStore: ConversationStore | null = null;

async function ensureStore(): Promise<void> {
  await mkdir(dirname(DATA_PATH), { recursive: true });
  try {
    await readFile(DATA_PATH, "utf-8");
  } catch {
    await writeFile(DATA_PATH, JSON.stringify({ conversations: [] }, null, 2), "utf-8");
  }
}

async function readStore(): Promise<ConversationStore> {
  if (memoryStore) return structuredClone(memoryStore);
  await ensureStore();
  try {
    const raw = await readFile(DATA_PATH, "utf-8");
    memoryStore = JSON.parse(raw) as ConversationStore;
    return structuredClone(memoryStore);
  } catch {
    const fresh = { conversations: [] };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: ConversationStore): Promise<void> {
  memoryStore = structuredClone(store);
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

async function mutateStore<T>(fn: (store: ConversationStore) => T | Promise<T>): Promise<T> {
  const store = await readStore();
  const result = await fn(store);
  await writeStore(store);
  return result;
}

export async function listConversations(memberEmail: string): Promise<Conversation[]> {
  const store = await readStore();
  return store.conversations
    .filter((c) => c.memberEmail === memberEmail.toLowerCase())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getConversation(id: string, memberEmail: string): Promise<Conversation | undefined> {
  const store = await readStore();
  return store.conversations.find((c) => c.id === id && c.memberEmail === memberEmail.toLowerCase());
}

export async function createConversation(memberEmail: string, title?: string): Promise<Conversation> {
  const now = new Date().toISOString();
  const conv: Conversation = {
    id: `conv-${crypto.randomUUID()}`,
    memberEmail: memberEmail.toLowerCase(),
    title: title ?? "New conversation",
    messages: [],
    documentIds: [],
    createdAt: now,
    updatedAt: now,
  };
  await mutateStore((store) => {
    store.conversations.unshift(conv);
    return conv;
  });
  return conv;
}

export async function appendMessages(
  id: string,
  memberEmail: string,
  messages: Omit<ChatMessage, "id" | "createdAt">[],
  documentIds?: string[],
): Promise<Conversation | undefined> {
  return mutateStore((store) => {
    const conv = store.conversations.find((c) => c.id === id && c.memberEmail === memberEmail.toLowerCase());
    if (!conv) return undefined;

    for (const msg of messages) {
      conv.messages.push({
        ...msg,
        id: `msg-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
      });
    }

    if (documentIds?.length) {
      conv.documentIds = [...new Set([...conv.documentIds, ...documentIds])];
    }

    if (conv.messages.length === 2 && conv.title === "New conversation") {
      const firstUser = conv.messages.find((m) => m.role === "user");
      if (firstUser) {
        conv.title = firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? "…" : "");
      }
    }

    conv.updatedAt = new Date().toISOString();
    return conv;
  });
}

export async function deleteConversation(id: string, memberEmail: string): Promise<boolean> {
  return mutateStore((store) => {
    const idx = store.conversations.findIndex((c) => c.id === id && c.memberEmail === memberEmail.toLowerCase());
    if (idx === -1) return false;
    store.conversations.splice(idx, 1);
    return true;
  });
}
