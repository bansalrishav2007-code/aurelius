import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";
import { computeWealthSummary, formatInr, recordNetWorthSnapshot, recordPortfolioSnapshot } from "./calculations";
import {
  appendTimelineEvent,
  ensureAccountCreatedEvent,
  normalizeCrossedMilestones,
  recordNetWorthMilestones,
} from "./timeline-events";
import { validateLiabilityName } from "./validation";
import { isSupabaseConfigured } from "@/lib/supabase/config.server";
import {
  deleteAssetFromSupabase,
  deleteLiabilityFromSupabase,
  insertAssetToSupabase,
  insertLiabilityToSupabase,
  loadWealthFromSupabase,
  recordWealthSnapshot,
  syncProfileToSupabase,
} from "@/lib/supabase/wealth.server";
import type {
  LegalEntity,
  LiabilityPaymentType,
  MemberWealthProfile,
  TaxSnapshot,
  WealthAsset,
  WealthExtractionDraft,
  WealthLiability,
  WealthStore,
} from "./types";

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-wealth.json");
  return dataPathPromise;
}

let memoryStore: WealthStore | null = null;

function emptyProfile(email: string): MemberWealthProfile {
  const now = new Date().toISOString();
  return {
    memberEmail: email.toLowerCase(),
    assets: [],
    liabilities: [],
    legalEntities: [],
    taxSnapshot: null,
    accountCreatedAt: now,
    timelineEvents: [],
    crossedMilestones: [],
    updatedAt: now,
  };
}

function netWorthOf(profile: MemberWealthProfile): number {
  const totalAssets = profile.assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = profile.liabilities.reduce((s, l) => s + (l.value ?? 0), 0);
  return totalAssets - totalLiabilities;
}

function migrateProfile(profile: MemberWealthProfile): void {
  profile.crossedMilestones = normalizeCrossedMilestones(profile.crossedMilestones);
  for (const liability of profile.liabilities) {
    if (liability.originalValue == null && liability.value > 0) {
      liability.originalValue = liability.value;
    }
    if (!liability.payments) liability.payments = [];
    if (!liability.status) liability.status = liability.value === 0 ? "closed" : "active";
  }
  for (const asset of profile.assets) {
    if (asset.originalValue == null) asset.originalValue = asset.value;
    if (!asset.valueHistory?.length) {
      asset.valueHistory = [{ value: asset.value, at: asset.createdAt }];
    }
  }
}

async function readStore(): Promise<WealthStore> {
  if (memoryStore) return structuredClone(memoryStore);
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(DATA_PATH, "utf-8")) as WealthStore;
    memoryStore = parsed;
    return structuredClone(parsed);
  } catch {
    const fresh: WealthStore = { profiles: [] };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: WealthStore): Promise<void> {
  memoryStore = structuredClone(store);
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function getOrCreateProfile(email: string): Promise<MemberWealthProfile> {
  const store = await readStore();
  const normalized = email.toLowerCase();
  let profile = store.profiles.find((p) => p.memberEmail === normalized);
  if (!profile) {
    profile = emptyProfile(normalized);
    store.profiles.push(profile);
    await writeStore(store);
  }
  migrateProfile(profile);

  if (isSupabaseConfigured()) {
    const fromDb = await loadWealthFromSupabase(normalized, structuredClone(profile));
    if (fromDb) {
      profile.assets = fromDb.assets;
      profile.liabilities = fromDb.liabilities;
    }
  }

  return structuredClone(profile);
}

export async function saveProfile(profile: MemberWealthProfile): Promise<MemberWealthProfile> {
  const store = await readStore();
  const normalized = profile.memberEmail.toLowerCase();
  const now = new Date().toISOString();
  profile.updatedAt = now;
  ensureAccountCreatedEvent(profile);
  const totalAssets = profile.assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = profile.liabilities.reduce((s, l) => s + l.value, 0);
  const netWorth = totalAssets - totalLiabilities;
  recordNetWorthMilestones(profile, netWorth, now);
  profile.netWorthSnapshots = recordNetWorthSnapshot(profile, netWorth);
  profile.portfolioSnapshots = recordPortfolioSnapshot(profile, netWorth, totalAssets, totalLiabilities);
  const idx = store.profiles.findIndex((p) => p.memberEmail === normalized);
  if (idx === -1) store.profiles.push(profile);
  else store.profiles[idx] = profile;
  await writeStore(store);

  if (isSupabaseConfigured()) {
    await syncProfileToSupabase(profile);
  }

  return structuredClone(profile);
}

export async function getMemberWealthOverview(email: string) {
  const profile = await getOrCreateProfile(email);
  return computeWealthSummary(profile);
}

export async function addWealthAsset(
  email: string,
  input: {
    name: string;
    category: WealthAsset["category"];
    value: number;
    dateAdded?: string;
    notes?: string;
    aiExtracted?: boolean;
    sourceDocumentId?: string;
  },
): Promise<MemberWealthProfile> {
  const profile = await getOrCreateProfile(email);
  const now = new Date().toISOString();
  const asset: WealthAsset = {
    id: `asset-${crypto.randomUUID()}`,
    memberEmail: email.toLowerCase(),
    name: input.name.trim(),
    category: input.category,
    value: input.value,
    originalValue: input.value,
    valueHistory: [{ value: input.value, at: now }],
    dateAdded: input.dateAdded ?? now.slice(0, 10),
    notes: input.notes?.trim(),
    aiExtracted: input.aiExtracted,
    sourceDocumentId: input.sourceDocumentId,
    createdAt: now,
    updatedAt: now,
  };
  profile.assets.unshift(asset);
  const isFirst = profile.assets.length === 1;
  const nw = netWorthOf(profile);
  appendTimelineEvent(profile, {
    type: isFirst ? "first_asset" : "asset_added",
    at: now,
    label: isFirst ? "First asset added" : `Asset added — ${asset.name}`,
    description: `${asset.name} logged at ${formatInr(asset.value)}.`,
    valueChange: asset.value,
    netWorthAfter: nw,
  });

  if (isSupabaseConfigured()) {
    await insertAssetToSupabase(email, asset);
    const totalAssets = profile.assets.reduce((s, a) => s + a.value, 0);
    const totalLiabilities = profile.liabilities.reduce((s, l) => s + l.value, 0);
    await recordWealthSnapshot(email, nw, totalAssets, totalLiabilities);
  }

  return saveProfile(profile);
}

export async function addWealthLiability(
  email: string,
  input: {
    name: string;
    type: WealthLiability["type"];
    value: number;
    originalValue?: number;
    dateAdded?: string;
    notes?: string;
    aiExtracted?: boolean;
    sourceDocumentId?: string;
  },
): Promise<MemberWealthProfile> {
  const nameCheck = validateLiabilityName(input.name);
  if (!nameCheck.ok) throw new Error(nameCheck.error);

  const profile = await getOrCreateProfile(email);
  const now = new Date().toISOString();
  const originalValue = Math.max(input.value, input.originalValue ?? input.value);
  const liability: WealthLiability = {
    id: `liability-${crypto.randomUUID()}`,
    memberEmail: email.toLowerCase(),
    name: input.name.trim(),
    type: input.type,
    value: input.value,
    originalValue,
    payments: [],
    status: "active",
    dateAdded: input.dateAdded ?? now.slice(0, 10),
    notes: input.notes?.trim(),
    aiExtracted: input.aiExtracted,
    sourceDocumentId: input.sourceDocumentId,
    createdAt: now,
    updatedAt: now,
  };
  profile.liabilities.unshift(liability);
  appendTimelineEvent(profile, {
    type: "liability_added",
    at: now,
    label: `Liability added — ${liability.name}`,
    description: `${liability.name} recorded at ${formatInr(liability.value)}.`,
    valueChange: -liability.value,
    netWorthAfter: netWorthOf(profile),
  });

  if (isSupabaseConfigured()) {
    await insertLiabilityToSupabase(email, liability);
    const totalAssets = profile.assets.reduce((s, a) => s + a.value, 0);
    const totalLiabilities = profile.liabilities.reduce((s, l) => s + l.value, 0);
    await recordWealthSnapshot(email, netWorthOf(profile), totalAssets, totalLiabilities);
  }

  return saveProfile(profile);
}

export async function deleteWealthAsset(email: string, assetId: string): Promise<boolean> {
  const profile = await getOrCreateProfile(email);
  const removed = profile.assets.find((a) => a.id === assetId);
  const before = profile.assets.length;
  profile.assets = profile.assets.filter((a) => a.id !== assetId);
  if (profile.assets.length === before) return false;
  if (removed) {
    appendTimelineEvent(profile, {
      type: "asset_deleted",
      at: new Date().toISOString(),
      label: `Asset removed — ${removed.name}`,
      description: `${removed.name} removed from portfolio.`,
      valueChange: -removed.value,
      netWorthAfter: netWorthOf(profile),
    });
  }
  if (isSupabaseConfigured()) await deleteAssetFromSupabase(email, assetId);
  await saveProfile(profile);
  return true;
}

export async function deleteWealthLiability(email: string, liabilityId: string): Promise<boolean> {
  const profile = await getOrCreateProfile(email);
  const removed = profile.liabilities.find((l) => l.id === liabilityId);
  const before = profile.liabilities.length;
  profile.liabilities = profile.liabilities.filter((l) => l.id !== liabilityId);
  if (profile.liabilities.length === before) return false;
  if (removed) {
    appendTimelineEvent(profile, {
      type: "liability_deleted",
      at: new Date().toISOString(),
      label: `Liability removed — ${removed.name}`,
      description: `${removed.name} removed from records.`,
      valueChange: removed.value,
      netWorthAfter: netWorthOf(profile),
    });
  }
  if (isSupabaseConfigured()) await deleteLiabilityFromSupabase(email, liabilityId);
  await saveProfile(profile);
  return true;
}

export async function applyWealthExtraction(
  email: string,
  draft: WealthExtractionDraft,
): Promise<MemberWealthProfile> {
  const profile = await getOrCreateProfile(email);
  const now = new Date().toISOString();

  for (const asset of draft.assets) {
    profile.assets.unshift({
      ...asset,
      originalValue: asset.value,
      valueHistory: [{ value: asset.value, at: now }],
      id: `asset-${crypto.randomUUID()}`,
      memberEmail: email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const liability of draft.liabilities) {
    profile.liabilities.unshift({
      ...liability,
      originalValue: liability.originalValue ?? liability.value,
      payments: liability.payments ?? [],
      status: liability.status ?? "active",
      id: `liability-${crypto.randomUUID()}`,
      memberEmail: email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const entity of draft.legalEntities) {
    profile.legalEntities.unshift({
      ...entity,
      id: `entity-${crypto.randomUUID()}`,
      memberEmail: email.toLowerCase(),
      updatedAt: now,
    });
  }

  if (draft.taxSnapshot) {
    profile.taxSnapshot = { ...draft.taxSnapshot, updatedAt: now };
  }

  return saveProfile(profile);
}

export async function upsertTaxSnapshot(email: string, snapshot: TaxSnapshot): Promise<MemberWealthProfile> {
  const profile = await getOrCreateProfile(email);
  profile.taxSnapshot = snapshot ? { ...snapshot, updatedAt: new Date().toISOString() } : null;
  return saveProfile(profile);
}

function deriveCompliance(due?: string): import("./types").ComplianceStatus {
  if (!due) return "compliant";
  const days = (new Date(due).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "overdue";
  if (days <= 30) return "due_soon";
  return "compliant";
}

function worstCompliance(...statuses: (import("./types").ComplianceStatus | undefined)[]): import("./types").ComplianceStatus {
  if (statuses.includes("overdue")) return "overdue";
  if (statuses.includes("due_soon")) return "due_soon";
  return "compliant";
}

export async function updateWealthAssetValue(
  email: string,
  assetId: string,
  newValue: number,
): Promise<MemberWealthProfile | null> {
  const profile = await getOrCreateProfile(email);
  const asset = profile.assets.find((a) => a.id === assetId);
  if (!asset || newValue <= 0) return null;
  const now = new Date().toISOString();
  const prev = asset.value;
  if (asset.originalValue == null) asset.originalValue = asset.value;
  asset.valueHistory = [...(asset.valueHistory ?? []), { value: newValue, at: now }].slice(-50);
  asset.value = newValue;
  asset.updatedAt = now;
  appendTimelineEvent(profile, {
    type: "asset_updated",
    at: now,
    label: `Asset updated — ${asset.name}`,
    description: `${asset.name} revised from ${formatInr(prev)} to ${formatInr(newValue)}.`,
    valueChange: newValue - prev,
    netWorthAfter: netWorthOf(profile),
  });
  return saveProfile(profile);
}

export async function updateWealthLiabilityValue(
  email: string,
  liabilityId: string,
  newValue: number,
): Promise<MemberWealthProfile | null> {
  const profile = await getOrCreateProfile(email);
  const liability = profile.liabilities.find((l) => l.id === liabilityId);
  if (!liability || newValue < 0) return null;
  const now = new Date().toISOString();
  if (liability.originalValue == null && newValue > 0) {
    liability.originalValue = newValue;
  }
  liability.value = newValue;
  liability.status = newValue === 0 ? "closed" : "active";
  liability.updatedAt = now;
  return saveProfile(profile);
}

export async function recordLiabilityPayment(
  email: string,
  liabilityId: string,
  input: {
    amount: number;
    date: string;
    type: LiabilityPaymentType;
    notes?: string;
  },
): Promise<MemberWealthProfile | null> {
  const profile = await getOrCreateProfile(email);
  const liability = profile.liabilities.find((l) => l.id === liabilityId);
  if (!liability || liability.status === "closed") return null;
  if (input.amount <= 0) return null;

  const now = new Date().toISOString();
  if (liability.originalValue == null) {
    liability.originalValue = liability.value;
  }

  const payment = {
    id: `pay-${crypto.randomUUID()}`,
    amount: input.amount,
    date: input.date,
    type: input.type,
    notes: input.notes?.trim(),
  };
  liability.payments = [...(liability.payments ?? []), payment];

  const isFullClosure = input.type === "full_closure";
  const newOutstanding = isFullClosure ? 0 : Math.max(0, liability.value - input.amount);
  liability.value = newOutstanding;
  liability.updatedAt = now;

  const paidTotal = (liability.originalValue ?? 0) - newOutstanding;
  const nw = netWorthOf(profile);

  if (isFullClosure || newOutstanding === 0) {
    liability.status = "closed";
    liability.value = 0;
    appendTimelineEvent(profile, {
      type: "loan_closed",
      at: now,
      label: `🎉 Loan closed — ${liability.name} fully repaid`,
      description: `Loan closed — ${liability.name} · Saved ${formatInr(paidTotal)}`,
      valueChange: paidTotal,
      netWorthAfter: nw,
    });
  } else {
    appendTimelineEvent(profile, {
      type: "loan_payment",
      at: now,
      label: `Loan payment — ${formatInr(input.amount)} paid towards ${liability.name}`,
      description: `Outstanding: ${formatInr(newOutstanding)}`,
      valueChange: input.amount,
      netWorthAfter: nw,
    });
  }

  return saveProfile(profile);
}

export async function dismissWealthAlert(email: string, alertId: string): Promise<MemberWealthProfile> {
  const profile = await getOrCreateProfile(email);
  const dismissed = [...(profile.dismissedAlerts ?? [])];
  const idx = dismissed.findIndex((d) => d.alertId === alertId);
  const entry = { alertId, dismissedAt: new Date().toISOString() };
  if (idx >= 0) dismissed[idx] = entry;
  else dismissed.push(entry);
  profile.dismissedAlerts = dismissed.slice(-50);
  return saveProfile(profile);
}

export async function addLegalEntity(
  email: string,
  input: Omit<LegalEntity, "id" | "memberEmail" | "updatedAt" | "complianceStatus"> & { id?: string },
): Promise<MemberWealthProfile> {
  const profile = await getOrCreateProfile(email);
  const now = new Date().toISOString();
  const complianceStatus = worstCompliance(
    deriveCompliance(input.rocFilingDue),
    deriveCompliance(input.gstFilingDue),
    deriveCompliance(input.itrFilingDue),
  );

  if (input.id) {
    const existing = profile.legalEntities.find((e) => e.id === input.id);
    if (existing) {
      Object.assign(existing, {
        name: input.name.trim(),
        entityType: input.entityType,
        role: input.role,
        shareholdingPercent: input.shareholdingPercent,
        value: input.value,
        notes: input.notes,
        documentIds: input.documentIds,
        rocFilingDue: input.rocFilingDue,
        gstFilingDue: input.gstFilingDue,
        itrFilingDue: input.itrFilingDue,
        complianceStatus,
        updatedAt: now,
      });
      return saveProfile(profile);
    }
  }

  profile.legalEntities.unshift({
    ...input,
    name: input.name.trim(),
    id: `entity-${crypto.randomUUID()}`,
    memberEmail: email.toLowerCase(),
    complianceStatus,
    updatedAt: now,
  });
  return saveProfile(profile);
}

export async function deleteLegalEntity(email: string, entityId: string): Promise<boolean> {
  const profile = await getOrCreateProfile(email);
  const before = profile.legalEntities.length;
  profile.legalEntities = profile.legalEntities.filter((e) => e.id !== entityId);
  if (profile.legalEntities.length === before) return false;
  await saveProfile(profile);
  return true;
}
