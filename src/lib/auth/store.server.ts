import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AuthStore, InviteCode, WaitlistApplication } from "./types";
import { ensureFounderAccount } from "./founder.server";

const DATA_PATH = join(process.cwd(), ".data", "aureliuss-auth.json");

function defaultStore(): AuthStore {
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const seedInvites: InviteCode[] = [
    {
      id: "inv-seed-dev",
      code: "AURA",
      label: "Development access",
      tier: "founding",
      maxUses: 100,
      useCount: 0,
      expiresAt: null,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: "system",
      notes: "Temporary development code — remove in production",
    },
    {
      id: "inv-seed-founder",
      code: "AURE-FOUND-2026",
      label: "Founding circle",
      tier: "founding",
      maxUses: 5,
      useCount: 0,
      expiresAt: null,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: "system",
      notes: "Development seed — no expiry",
    },
    {
      id: "inv-seed-principal",
      code: "AURE-PRIN-DEMO",
      label: "Principal preview",
      tier: "principal",
      maxUses: 1,
      useCount: 0,
      expiresAt: in30Days.toISOString(),
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: "system",
    },
  ];

  return {
    invites: seedInvites,
    waitlist: [],
    members: [],
    admins: [],
  };
}

function seedDefaultStore(): AuthStore {
  const store = defaultStore();
  ensureFounderAccount(store);
  return store;
}

let memoryStore: AuthStore | null = null;

async function ensureDataFile(): Promise<void> {
  await mkdir(dirname(DATA_PATH), { recursive: true });
  try {
    await readFile(DATA_PATH, "utf-8");
  } catch {
    await writeFile(DATA_PATH, JSON.stringify(seedDefaultStore(), null, 2), "utf-8");
  }
}

export async function readStore(): Promise<AuthStore> {
  if (memoryStore) return structuredClone(memoryStore);

  await ensureDataFile();
  try {
    const raw = await readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as AuthStore;
    parsed.waitlist = parsed.waitlist.map(normalizeWaitlistEntry);
    if (ensureFounderAccount(parsed)) {
      await writeStore(parsed);
    }
    memoryStore = parsed;
    return structuredClone(parsed);
  } catch {
    const fresh = seedDefaultStore();
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

/** Migrate legacy waitlist rows to the current schema */
function normalizeWaitlistEntry(
  w: WaitlistApplication & { role?: string; firm?: string; message?: string },
): WaitlistApplication {
  return {
    id: w.id,
    fullName: w.fullName,
    email: w.email,
    phone: w.phone ?? "",
    profession: w.profession ?? w.role ?? "",
    netWorthBand: w.netWorthBand || undefined,
    whyAccess: w.whyAccess ?? w.message ?? "",
    status: w.status,
    createdAt: w.createdAt,
    reviewedAt: w.reviewedAt,
    inviteCodeId: w.inviteCodeId,
    inviteCode: w.inviteCode,
    invitationSentAt: w.invitationSentAt,
  };
}

export async function writeStore(store: AuthStore): Promise<void> {
  memoryStore = structuredClone(store);
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function mutateStore<T>(fn: (store: AuthStore) => T | Promise<T>): Promise<T> {
  const store = await readStore();
  const result = await fn(store);
  await writeStore(store);
  return result;
}

export function normalizeInviteInput(raw: string): string {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "");
  if (cleaned === "AURA" || cleaned === "AURE") return "AURA";
  return cleaned;
}

export function generateInviteCode(): string {
  const seg = () =>
    Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  return `AURE-${seg()}-${seg()}`;
}

export function refreshInviteStatuses(invites: InviteCode[]): void {
  const now = Date.now();
  for (const inv of invites) {
    if (inv.status === "revoked" || inv.status === "used") continue;
    if (inv.expiresAt && new Date(inv.expiresAt).getTime() < now) {
      inv.status = "expired";
    } else if (inv.useCount >= inv.maxUses) {
      inv.status = "used";
    } else {
      inv.status = "active";
    }
  }
}

export async function addWaitlistEntry(
  entry: Omit<WaitlistApplication, "id" | "status" | "createdAt">,
) {
  return mutateStore((store) => {
    const email = entry.email.trim().toLowerCase();
    const duplicate = store.waitlist.some((w) => w.email.toLowerCase() === email);
    if (duplicate) {
      return { ok: false as const, error: "An application with this email already exists." };
    }
    const row: WaitlistApplication = {
      fullName: entry.fullName.trim(),
      email,
      phone: entry.phone.trim(),
      profession: entry.profession.trim(),
      netWorthBand: entry.netWorthBand?.trim() || undefined,
      whyAccess: entry.whyAccess.trim(),
      id: `wl-${crypto.randomUUID()}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    store.waitlist.unshift(row);
    return { ok: true as const, id: row.id };
  });
}
