import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";
import type { TaxCalculatorInput } from "@/lib/wealth/tax-calculator";

export type MemberPreferences = {
  memberId: string;
  memberEmail: string;
  marketIntelKeywords?: string[];
  dashboardActivity?: { moduleId: string; lastVisited: string }[];
  lastTaxInput?: TaxCalculatorInput;
  lastTaxSavedAt?: string;
  settings?: {
    emailDigest?: boolean;
    marketAlerts?: boolean;
  };
  updatedAt: string;
};

type PreferencesStore = { preferences: MemberPreferences[] };

let cache: PreferencesStore | null = null;
let pathPromise: Promise<string> | null = null;

async function dataPath() {
  pathPromise ??= resolveDataFile("aurelius-member-preferences.json");
  return pathPromise;
}

async function readStore(): Promise<PreferencesStore> {
  if (cache) return structuredClone(cache);
  const path = await dataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as PreferencesStore;
    cache = { preferences: parsed.preferences ?? [] };
    return structuredClone(cache);
  } catch {
    const fresh = { preferences: [] };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: PreferencesStore) {
  cache = structuredClone(store);
  const path = await dataPath();
  await writeFile(path, JSON.stringify(store, null, 2), "utf8");
}

export async function getMemberPreferences(memberId: string, memberEmail: string): Promise<MemberPreferences> {
  const email = memberEmail.toLowerCase();
  const store = await readStore();
  let prefs = store.preferences.find((p) => p.memberId === memberId && p.memberEmail === email);
  if (!prefs) {
    prefs = {
      memberId,
      memberEmail: email,
      updatedAt: new Date().toISOString(),
    };
    store.preferences.push(prefs);
    await writeStore(store);
  }
  return structuredClone(prefs);
}

export async function updateMemberPreferences(
  memberId: string,
  memberEmail: string,
  patch: Partial<Omit<MemberPreferences, "memberId" | "memberEmail">>,
): Promise<MemberPreferences> {
  const email = memberEmail.toLowerCase();
  const store = await readStore();
  let prefs = store.preferences.find((p) => p.memberId === memberId && p.memberEmail === email);
  if (!prefs) {
    prefs = { memberId, memberEmail: email, updatedAt: new Date().toISOString() };
    store.preferences.push(prefs);
  }
  Object.assign(prefs, patch, { updatedAt: new Date().toISOString() });
  await writeStore(store);
  return structuredClone(prefs);
}
