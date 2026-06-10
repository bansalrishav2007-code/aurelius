import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";

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

type ConversationStore = { conversations: Conversation[] };

const MAX_STORED_MESSAGES = 100;

let dataPathPromise: Promise<string> | null = null;
let memoryStore: ConversationStore | null = null;

async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-conversations.json");
  return dataPathPromise;
}

async function readStore(): Promise<ConversationStore> {
  if (memoryStore) return structuredClone(memoryStore);
  const path = await getDataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(path, "utf-8")) as ConversationStore;
    memoryStore = parsed;
    return structuredClone(parsed);
  } catch {
    const fresh: ConversationStore = { conversations: [] };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: ConversationStore) {
  memoryStore = structuredClone(store);
  const path = await getDataPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(store, null, 2), "utf-8");
}

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

export async function listConversations(memberEmail: string): Promise<Conversation[]> {
  const store = await readStore();
  return store.conversations
    .filter((c) => c.memberEmail === normalizeEmail(memberEmail))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConversation(id: string, memberEmail: string): Promise<Conversation | null> {
  const store = await readStore();
  const conv = store.conversations.find(
    (c) => c.id === id && c.memberEmail === normalizeEmail(memberEmail),
  );
  return conv ? structuredClone(conv) : null;
}

export async function createConversation(memberEmail: string, title?: string): Promise<Conversation> {
  const store = await readStore();
  const now = new Date().toISOString();
  const conv: Conversation = {
    id: `conv-${crypto.randomUUID()}`,
    memberEmail: normalizeEmail(memberEmail),
    title: title?.trim() || "New conversation",
    messages: [],
    documentIds: [],
    createdAt: now,
    updatedAt: now,
  };
  store.conversations.unshift(conv);
  await writeStore(store);
  return structuredClone(conv);
}

export async function updateConversationTitle(
  id: string,
  memberEmail: string,
  title: string,
): Promise<Conversation | null> {
  const store = await readStore();
  const conv = store.conversations.find(
    (c) => c.id === id && c.memberEmail === normalizeEmail(memberEmail),
  );
  if (!conv) return null;
  const cleaned = title.trim().slice(0, 72);
  if (!cleaned) return structuredClone(conv);
  conv.title = cleaned;
  conv.updatedAt = new Date().toISOString();
  await writeStore(store);
  return structuredClone(conv);
}

export async function deleteConversation(id: string, memberEmail: string): Promise<boolean> {
  const store = await readStore();
  const before = store.conversations.length;
  store.conversations = store.conversations.filter(
    (c) => !(c.id === id && c.memberEmail === normalizeEmail(memberEmail)),
  );
  if (store.conversations.length === before) return false;
  await writeStore(store);
  return true;
}

export async function appendMessages(
  id: string,
  memberEmail: string,
  messages: { role: "user" | "assistant"; content: string }[],
  documentIds?: string[],
): Promise<Conversation | null> {
  const store = await readStore();
  const conv = store.conversations.find(
    (c) => c.id === id && c.memberEmail === normalizeEmail(memberEmail),
  );
  if (!conv) return null;

  const now = new Date().toISOString();
  for (const msg of messages) {
    conv.messages.push({
      id: `msg-${crypto.randomUUID()}`,
      role: msg.role,
      content: msg.content.trim(),
      createdAt: now,
    });
  }
  conv.messages = conv.messages.slice(-MAX_STORED_MESSAGES);

  if (documentIds?.length) {
    conv.documentIds = [...new Set([...conv.documentIds, ...documentIds])];
  }

  const firstUser = conv.messages.find((m) => m.role === "user");
  if (firstUser && (conv.title === "New conversation" || !conv.title.trim())) {
    conv.title = firstUser.content.slice(0, 72) + (firstUser.content.length > 72 ? "…" : "");
  }

  conv.updatedAt = now;
  await writeStore(store);

  try {
    const { upsertAiSession } = await import("@/lib/supabase/data.server");
    const supaId = (conv as Conversation & { supabaseSessionId?: string }).supabaseSessionId ?? null;
    const newId = await upsertAiSession(
      memberEmail,
      supaId,
      conv.title,
      conv.messages.map((m) => ({ role: m.role, content: m.content, at: m.createdAt })),
    );
    if (newId) (conv as Conversation & { supabaseSessionId?: string }).supabaseSessionId = newId;
  } catch {
    /* Supabase optional */
  }
  return structuredClone(conv);
}
