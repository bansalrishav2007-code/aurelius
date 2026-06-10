import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";
import type { FamilyMember, FamilyStore } from "./types";

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-family.json");
  return dataPathPromise;
}

let cache: FamilyStore | null = null;

async function readStore(): Promise<FamilyStore> {
  if (cache) return structuredClone(cache);
  const path = await getDataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    cache = JSON.parse(await readFile(path, "utf-8")) as FamilyStore;
    return structuredClone(cache);
  } catch {
    const fresh: FamilyStore = { members: [], updatedAt: new Date().toISOString() };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: FamilyStore): Promise<void> {
  store.updatedAt = new Date().toISOString();
  cache = structuredClone(store);
  const path = await getDataPath();
  await writeFile(path, JSON.stringify(store, null, 2), "utf-8");
}

export async function listFamilyMembers(ownerEmail: string): Promise<FamilyMember[]> {
  const store = await readStore();
  return store.members.filter((m) => m.ownerEmail === ownerEmail.toLowerCase());
}

export async function getFamilyProfileUpdatedAt(ownerEmail: string): Promise<string | undefined> {
  const members = await listFamilyMembers(ownerEmail);
  if (members.length === 0) return undefined;
  return members.reduce((latest, m) => (m.updatedAt > latest ? m.updatedAt : latest), members[0].updatedAt);
}

export async function upsertFamilyMember(
  ownerEmail: string,
  input: Omit<FamilyMember, "id" | "ownerEmail" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<FamilyMember> {
  const store = await readStore();
  const email = ownerEmail.toLowerCase();
  const now = new Date().toISOString();

  if (input.id) {
    const existing = store.members.find((m) => m.id === input.id && m.ownerEmail === email);
    if (existing) {
      Object.assign(existing, {
        name: input.name.trim(),
        relation: input.relation.trim(),
        pan: input.pan?.trim(),
        dob: input.dob,
        accessLevel: input.accessLevel,
        assetIds: input.assetIds,
        unused80CLimit: input.unused80CLimit,
        updatedAt: now,
      });
      await writeStore(store);
      return { ...existing };
    }
  }

  const member: FamilyMember = {
    id: `fam-${crypto.randomUUID()}`,
    ownerEmail: email,
    name: input.name.trim(),
    relation: input.relation.trim(),
    pan: input.pan?.trim(),
    dob: input.dob,
    accessLevel: input.accessLevel,
    assetIds: input.assetIds,
    unused80CLimit: input.unused80CLimit,
    createdAt: now,
    updatedAt: now,
  };
  store.members.unshift(member);
  await writeStore(store);
  return member;
}

export async function deleteFamilyMember(ownerEmail: string, id: string): Promise<boolean> {
  const store = await readStore();
  const idx = store.members.findIndex((m) => m.id === id && m.ownerEmail === ownerEmail.toLowerCase());
  if (idx === -1) return false;
  store.members.splice(idx, 1);
  await writeStore(store);
  return true;
}
