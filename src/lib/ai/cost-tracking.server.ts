import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";

export type AiProvider = "claude" | "openai";

export type AiCallLog = {
  id: string;
  provider: AiProvider;
  feature: string;
  memberEmail?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  responseTimeMs: number;
  success: boolean;
  fallback?: boolean;
  errorCode?: string;
  questionHash?: string;
  createdAt: string;
};

type AiCostStore = { calls: AiCallLog[] };

const PRICING: Record<AiProvider, { inputPer1M: number; outputPer1M: number }> = {
  claude: { inputPer1M: 3, outputPer1M: 15 },
  openai: { inputPer1M: 2.5, outputPer1M: 10 },
};

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-ai-costs.json");
  return dataPathPromise;
}

let memoryStore: AiCostStore | null = null;

async function readStore(): Promise<AiCostStore> {
  if (memoryStore) return structuredClone(memoryStore);
  const path = await getDataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    memoryStore = JSON.parse(await readFile(path, "utf-8")) as AiCostStore;
    return structuredClone(memoryStore);
  } catch {
    const fresh = { calls: [] };
    await writeFile(path, JSON.stringify(fresh, null, 2), "utf-8");
    memoryStore = fresh;
    return structuredClone(fresh);
  }
}

async function writeStore(store: AiCostStore): Promise<void> {
  memoryStore = structuredClone(store);
  const path = await getDataPath();
  await writeFile(path, JSON.stringify(store, null, 2), "utf-8");
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateCostUsd(provider: AiProvider, inputTokens: number, outputTokens: number): number {
  const p = PRICING[provider];
  return (
    (inputTokens / 1_000_000) * p.inputPer1M + (outputTokens / 1_000_000) * p.outputPer1M
  );
}

export function anonymiseQuestion(text: string): string {
  return createHash("sha256").update(text.slice(0, 200)).digest("hex").slice(0, 16);
}

export async function logAiCall(entry: Omit<AiCallLog, "id" | "createdAt">): Promise<void> {
  const store = await readStore();
  store.calls.unshift({
    ...entry,
    id: `ai-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  });
  if (store.calls.length > 10_000) store.calls.length = 10_000;
  await writeStore(store);
}

export async function getAiCostSummary() {
  const store = await readStore();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let todayCalls = 0;
  let monthClaude = 0;
  let monthGpt = 0;
  let todayCost = 0;
  let monthCost = 0;
  let totalResponseMs = 0;
  let errors = 0;
  let rateLimitHits = 0;
  const questionCounts = new Map<string, number>();

  for (const call of store.calls) {
    const ts = new Date(call.createdAt).getTime();
    if (ts >= startOfDay) {
      todayCalls += 1;
      todayCost += call.costUsd;
    }
    if (ts >= startOfMonth) {
      monthCost += call.costUsd;
      if (call.provider === "claude") monthClaude += call.costUsd;
      else monthGpt += call.costUsd;
    }
    totalResponseMs += call.responseTimeMs;
    if (!call.success) errors += 1;
    if (call.errorCode === "RATE_LIMIT") rateLimitHits += 1;
    if (call.questionHash) {
      questionCounts.set(call.questionHash, (questionCounts.get(call.questionHash) ?? 0) + 1);
    }
  }

  const topQuestions = [...questionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hash, count]) => ({ hash, count }));

  return {
    totalCalls: store.calls.length,
    todayCalls,
    todayCostUsd: Math.round(todayCost * 100) / 100,
    monthCostUsd: Math.round(monthCost * 100) / 100,
    monthClaudeUsd: Math.round(monthClaude * 100) / 100,
    monthGptUsd: Math.round(monthGpt * 100) / 100,
    avgResponseTimeMs:
      store.calls.length > 0 ? Math.round(totalResponseMs / store.calls.length) : 0,
    errorRate:
      store.calls.length > 0 ? Math.round((errors / store.calls.length) * 1000) / 10 : 0,
    rateLimitHits,
    topQuestionHashes: topQuestions,
    recent: store.calls.slice(0, 20).map((c) => ({
      provider: c.provider,
      feature: c.feature,
      costUsd: Math.round(c.costUsd * 10000) / 10000,
      responseTimeMs: c.responseTimeMs,
      success: c.success,
      fallback: c.fallback,
      createdAt: c.createdAt,
    })),
  };
}
