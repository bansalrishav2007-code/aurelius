import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";

export type UsageEvent = {
  id: string;
  memberEmail: string;
  type: "chat" | "upload" | "analyze";
  tokensEstimate?: number;
  createdAt: string;
};

type UsageStore = { events: UsageEvent[] };

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-usage.json", "aureliuss-usage.json");
  return dataPathPromise;
}
let memoryStore: UsageStore | null = null;

async function ensureStore(): Promise<void> {
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  try {
    await readFile(DATA_PATH, "utf-8");
  } catch {
    await writeFile(DATA_PATH, JSON.stringify({ events: [] }, null, 2), "utf-8");
  }
}

async function mutateStore<T>(fn: (store: UsageStore) => T): Promise<T> {
  await ensureStore();
  const DATA_PATH = await getDataPath();
  let store: UsageStore;
  try {
    store = JSON.parse(await readFile(DATA_PATH, "utf-8")) as UsageStore;
  } catch {
    store = { events: [] };
  }
  const result = fn(store);
  memoryStore = store;
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
  return result;
}

export async function trackUsage(
  memberEmail: string,
  type: UsageEvent["type"],
  tokensEstimate?: number,
): Promise<void> {
  await mutateStore((store) => {
    store.events.unshift({
      id: `use-${crypto.randomUUID()}`,
      memberEmail: memberEmail.toLowerCase(),
      type,
      tokensEstimate,
      createdAt: new Date().toISOString(),
    });
    if (store.events.length > 5000) store.events.length = 5000;
  });
}

export async function countMemberUsageToday(
  memberEmail: string,
  type: UsageEvent["type"] = "chat",
): Promise<number> {
  const email = memberEmail.toLowerCase();
  const d = new Date();
  const cutoff = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const DATA_PATH = await getDataPath();
  const store =
    memoryStore ??
    (JSON.parse(await readFile(DATA_PATH, "utf-8").catch(() => '{"events":[]}')) as UsageStore);
  return store.events.filter(
    (e) => e.memberEmail === email && e.type === type && new Date(e.createdAt).getTime() >= cutoff,
  ).length;
}

export async function getUsageSummary() {
  const DATA_PATH = await getDataPath();
  const store = memoryStore ?? JSON.parse(await readFile(DATA_PATH, "utf-8").catch(() => '{"events":[]}')) as UsageStore;
  const byMember: Record<string, { chat: number; upload: number; analyze: number }> = {};
  for (const e of store.events) {
    byMember[e.memberEmail] ??= { chat: 0, upload: 0, analyze: 0 };
    byMember[e.memberEmail][e.type] += 1;
  }
  return {
    totalEvents: store.events.length,
    byMember,
    recent: store.events.slice(0, 50),
  };
}
