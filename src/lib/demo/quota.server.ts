import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";
import { DEMO_AI_QUOTA_DAILY } from "./constants";

type QuotaEntry = { date: string; count: number };

type DemoQuotaStore = {
  usage: Record<string, QuotaEntry>;
};

let dataPathPromise: Promise<string> | null = null;

async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-demo-quota.json");
  return dataPathPromise;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readQuotaStore(): Promise<DemoQuotaStore> {
  const path = await getDataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    return JSON.parse(await readFile(path, "utf-8")) as DemoQuotaStore;
  } catch {
    return { usage: {} };
  }
}

async function writeQuotaStore(store: DemoQuotaStore): Promise<void> {
  const path = await getDataPath();
  await writeFile(path, JSON.stringify(store, null, 2), "utf-8");
}

export async function getDemoAiUsageToday(email: string): Promise<number> {
  const store = await readQuotaStore();
  const key = email.trim().toLowerCase();
  const entry = store.usage[key];
  if (!entry || entry.date !== todayKey()) return 0;
  return entry.count;
}

export async function checkDemoAiQuota(
  email: string,
  limit = DEMO_AI_QUOTA_DAILY,
): Promise<{ allowed: boolean; used: number; remaining: number; limit: number }> {
  const used = await getDemoAiUsageToday(email);
  const remaining = Math.max(0, limit - used);
  return { allowed: remaining > 0, used, remaining, limit };
}

export async function consumeDemoAiQuota(
  email: string,
  limit = DEMO_AI_QUOTA_DAILY,
): Promise<{ allowed: boolean; used: number; remaining: number; limit: number }> {
  const store = await readQuotaStore();
  const key = email.trim().toLowerCase();
  const today = todayKey();
  const entry = store.usage[key];
  const used = entry?.date === today ? entry.count : 0;

  if (used >= limit) {
    return { allowed: false, used, remaining: 0, limit };
  }

  store.usage[key] = { date: today, count: used + 1 };
  await writeQuotaStore(store);

  const nextUsed = used + 1;
  return { allowed: true, used: nextUsed, remaining: Math.max(0, limit - nextUsed), limit };
}
