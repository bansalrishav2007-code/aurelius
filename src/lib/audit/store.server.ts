import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { resolveDataFile } from "@/lib/data-path.server";

export type AuditEvent = {
  id: string;
  memberId?: string;
  memberEmail?: string;
  action: "create" | "update" | "delete" | "access_denied" | "login" | "logout" | "export";
  resourceType: string;
  resourceId?: string;
  detail: string;
  ip?: string;
  userAgent?: string;
  severity: "info" | "security";
  createdAt: string;
};

type AuditStore = { events: AuditEvent[] };

const MAX_EVENTS = 10_000;
const RETENTION_YEARS = 7;

let cache: AuditStore | null = null;
let pathPromise: Promise<string> | null = null;

async function dataPath() {
  pathPromise ??= resolveDataFile("aurelius-audit.json");
  return pathPromise;
}

async function readStore(): Promise<AuditStore> {
  if (cache) return structuredClone(cache);
  const path = await dataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as AuditStore;
    cache = { events: parsed.events ?? [] };
    return structuredClone(cache);
  } catch {
    const fresh = { events: [] };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: AuditStore) {
  const cutoff = Date.now() - RETENTION_YEARS * 365 * 24 * 60 * 60 * 1000;
  store.events = store.events
    .filter((e) => new Date(e.createdAt).getTime() >= cutoff)
    .slice(-MAX_EVENTS);
  cache = structuredClone(store);
  const path = await dataPath();
  await writeFile(path, JSON.stringify(store, null, 2), "utf8");
}

export async function logAuditEvent(
  event: Omit<AuditEvent, "id" | "createdAt"> & { createdAt?: string },
): Promise<void> {
  const store = await readStore();
  store.events.push({
    id: `aud-${randomUUID()}`,
    createdAt: event.createdAt ?? new Date().toISOString(),
    ...event,
  });
  await writeStore(store);
}

export async function listAuditEventsForMember(
  memberEmail: string,
  limit = 100,
): Promise<AuditEvent[]> {
  const normalized = memberEmail.trim().toLowerCase();
  const store = await readStore();
  return store.events
    .filter((e) => e.memberEmail?.toLowerCase() === normalized)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
