import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";
import type { ComplianceStatus, LegalEntitiesStore, TrackedLegalEntity } from "./types";

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-legal-entities.json");
  return dataPathPromise;
}

let cache: LegalEntitiesStore | null = null;

async function readStore(): Promise<LegalEntitiesStore> {
  if (cache) return structuredClone(cache);
  const path = await getDataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    cache = JSON.parse(await readFile(path, "utf-8")) as LegalEntitiesStore;
    return structuredClone(cache);
  } catch {
    const fresh: LegalEntitiesStore = { entities: [] };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: LegalEntitiesStore): Promise<void> {
  cache = structuredClone(store);
  const path = await getDataPath();
  await writeFile(path, JSON.stringify(store, null, 2), "utf-8");
}

function deriveCompliance(due?: string): ComplianceStatus {
  if (!due) return "compliant";
  const days = (new Date(due).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "overdue";
  if (days <= 30) return "due_soon";
  return "compliant";
}

export async function listLegalEntities(email: string): Promise<TrackedLegalEntity[]> {
  const store = await readStore();
  return store.entities.filter((e) => e.memberEmail === email.toLowerCase());
}

export async function upsertLegalEntity(
  email: string,
  input: Omit<TrackedLegalEntity, "id" | "memberEmail" | "createdAt" | "updatedAt" | "complianceStatus"> & {
    id?: string;
  },
): Promise<TrackedLegalEntity> {
  const store = await readStore();
  const normalized = email.toLowerCase();
  const now = new Date().toISOString();
  const complianceStatus = deriveCompliance(input.rocFilingDue);

  if (input.id) {
    const existing = store.entities.find((e) => e.id === input.id && e.memberEmail === normalized);
    if (existing) {
      Object.assign(existing, {
        name: input.name.trim(),
        entityType: input.entityType,
        role: input.role,
        shareholdingPercent: input.shareholdingPercent,
        estimatedValuation: input.estimatedValuation,
        rocFilingDue: input.rocFilingDue,
        complianceStatus,
        documentIds: input.documentIds,
        notes: input.notes?.trim(),
        updatedAt: now,
      });
      await writeStore(store);
      return { ...existing };
    }
  }

  const entity: TrackedLegalEntity = {
    id: `ent-${crypto.randomUUID()}`,
    memberEmail: normalized,
    name: input.name.trim(),
    entityType: input.entityType,
    role: input.role,
    shareholdingPercent: input.shareholdingPercent,
    estimatedValuation: input.estimatedValuation,
    rocFilingDue: input.rocFilingDue,
    complianceStatus,
    documentIds: input.documentIds,
    notes: input.notes?.trim(),
    createdAt: now,
    updatedAt: now,
  };
  store.entities.unshift(entity);
  await writeStore(store);
  return entity;
}

export async function deleteLegalEntity(email: string, id: string): Promise<boolean> {
  const store = await readStore();
  const idx = store.entities.findIndex((e) => e.id === id && e.memberEmail === email.toLowerCase());
  if (idx === -1) return false;
  store.entities.splice(idx, 1);
  await writeStore(store);
  return true;
}

export function entityAiFlags(entities: TrackedLegalEntity[]): string[] {
  const flags: string[] = [];
  for (const e of entities) {
    if (e.complianceStatus === "due_soon") flags.push(`${e.name}: ROC filing due within 30 days`);
    if (e.complianceStatus === "overdue") flags.push(`${e.name}: ROC filing overdue`);
  }
  if (entities.length >= 3) flags.push("Review holding structure — multiple entities may benefit from a consolidated holding company.");
  return flags;
}
