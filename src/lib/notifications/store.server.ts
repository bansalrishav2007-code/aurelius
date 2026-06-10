import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { resolveDataFile } from "@/lib/data-path.server";

export type MemberNotification = {
  id: string;
  memberId: string;
  memberEmail: string;
  title: string;
  body: string;
  category: "system" | "tax" | "wealth" | "expert" | "security";
  read: boolean;
  createdAt: string;
};

type NotificationStore = { notifications: MemberNotification[] };

let cache: NotificationStore | null = null;
let pathPromise: Promise<string> | null = null;

async function dataPath() {
  pathPromise ??= resolveDataFile("aurelius-notifications.json");
  return pathPromise;
}

async function readStore(): Promise<NotificationStore> {
  if (cache) return structuredClone(cache);
  const path = await dataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as NotificationStore;
    cache = { notifications: parsed.notifications ?? [] };
    return structuredClone(cache);
  } catch {
    const fresh = { notifications: [] };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: NotificationStore) {
  cache = structuredClone(store);
  const path = await dataPath();
  await writeFile(path, JSON.stringify(store, null, 2), "utf8");
}

export async function listNotifications(memberEmail: string, memberId: string): Promise<MemberNotification[]> {
  const email = memberEmail.toLowerCase();
  const store = await readStore();
  return store.notifications
    .filter((n) => n.memberEmail === email && n.memberId === memberId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addNotification(
  input: Omit<MemberNotification, "id" | "createdAt" | "read">,
): Promise<MemberNotification> {
  const store = await readStore();
  const notification: MemberNotification = {
    ...input,
    memberEmail: input.memberEmail.toLowerCase(),
    id: `ntf-${randomUUID()}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  store.notifications.push(notification);
  await writeStore(store);

  try {
    const { insertNotification } = await import("@/lib/supabase/data.server");
    await insertNotification(input.memberEmail, {
      title: input.title,
      message: input.body,
      type: input.category,
    });
  } catch {
    /* Supabase optional */
  }

  return notification;
}

export async function markNotificationRead(memberEmail: string, memberId: string, id: string): Promise<boolean> {
  const email = memberEmail.toLowerCase();
  const store = await readStore();
  const item = store.notifications.find((n) => n.id === id && n.memberEmail === email && n.memberId === memberId);
  if (!item) return false;
  item.read = true;
  await writeStore(store);
  return true;
}
