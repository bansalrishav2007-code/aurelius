import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";
import type { SuccessionPlan, SuccessionStore } from "./types";

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-succession.json");
  return dataPathPromise;
}

let cache: SuccessionStore | null = null;

function emptyPlan(email: string): SuccessionPlan {
  return {
    memberEmail: email.toLowerCase(),
    familyTree: [],
    willStatus: "no",
    hasFamilyTrust: false,
    updatedAt: new Date().toISOString(),
  };
}

async function readStore(): Promise<SuccessionStore> {
  if (cache) return structuredClone(cache);
  const path = await getDataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    cache = JSON.parse(await readFile(path, "utf-8")) as SuccessionStore;
    return structuredClone(cache);
  } catch {
    const fresh: SuccessionStore = { plans: [] };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: SuccessionStore): Promise<void> {
  cache = structuredClone(store);
  const path = await getDataPath();
  await writeFile(path, JSON.stringify(store, null, 2), "utf-8");
}

export function buildSuccessionAiRecommendation(plan: SuccessionPlan, netWorth: number): string {
  const issues: string[] = [];
  if (plan.willStatus !== "yes") issues.push("Will not finalised");
  if (!plan.hasFamilyTrust && netWorth >= 5_00_00_000) issues.push("Consider HUF or family trust for tax-efficient succession");
  if (plan.familyTree.length === 0) issues.push("Family tree incomplete — assign beneficiaries to key assets");
  if (issues.length === 0) return "Succession structure looks sound. Review annually with your Aurelius expert.";
  return `Action needed: ${issues.join(" · ")}.`;
}

export async function getSuccessionPlan(email: string): Promise<SuccessionPlan> {
  const store = await readStore();
  const found = store.plans.find((p) => p.memberEmail === email.toLowerCase());
  return found ? structuredClone(found) : emptyPlan(email);
}

export async function saveSuccessionPlan(plan: SuccessionPlan): Promise<SuccessionPlan> {
  const store = await readStore();
  plan.updatedAt = new Date().toISOString();
  plan.memberEmail = plan.memberEmail.toLowerCase();
  const idx = store.plans.findIndex((p) => p.memberEmail === plan.memberEmail);
  if (idx >= 0) store.plans[idx] = plan;
  else store.plans.push(plan);
  await writeStore(store);
  return structuredClone(plan);
}
