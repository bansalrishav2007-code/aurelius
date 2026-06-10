import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AuthStore, InviteCode, WaitlistApplication } from "./types";
import { ensureFounderAccount } from "./founder.server";
import { resolveDataFile } from "@/lib/data-path.server";

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-auth.json", "aureliuss-auth.json");
  return dataPathPromise;
}

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
    membershipApplications: [],
    upgradeRequests: [],
    adminActivity: [],
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
  const DATA_PATH = await getDataPath();
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
  const DATA_PATH = await getDataPath();
  try {
    const raw = await readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as AuthStore;
    parsed.waitlist = parsed.waitlist.map(normalizeWaitlistEntry);
    parsed.membershipApplications = parsed.membershipApplications ?? [];
    parsed.upgradeRequests = parsed.upgradeRequests ?? [];
    parsed.adminActivity = parsed.adminActivity ?? [];
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
    wealthConcern: w.wealthConcern || undefined,
    netWorthBand: w.netWorthBand || undefined,
    whyAccess: w.whyAccess ?? w.message ?? "",
    status: w.status,
    createdAt: w.createdAt,
    reviewedAt: w.reviewedAt,
    company: w.company || undefined,
    emailVerifiedAt: w.emailVerifiedAt,
    inviteCodeId: w.inviteCodeId,
    inviteCode: w.inviteCode,
    invitationSentAt: w.invitationSentAt,
    adminNotes: w.adminNotes,
    declineReason: w.declineReason,
  };
}

export async function writeStore(store: AuthStore): Promise<void> {
  memoryStore = structuredClone(store);
  const DATA_PATH = await getDataPath();
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

export { generateInviteCode, generateUniqueInviteCode, INVITE_CODE_LENGTH } from "./invite-code";

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
  entry: Omit<WaitlistApplication, "id" | "status" | "createdAt"> & { emailVerifiedAt: string },
) {
  return mutateStore((store) => {
    const email = entry.email.trim().toLowerCase();
    const duplicateWaitlist = store.waitlist.some((w) => w.email.toLowerCase() === email);
    if (duplicateWaitlist) {
      return { ok: false as const, error: "An application with this email already exists." };
    }
    const existingMember = store.members.some((m) => m.email === email && !m.revoked);
    if (existingMember) {
      return { ok: false as const, error: "This email is already registered as an Aurelius member." };
    }
    const referenceNumber =
      entry.referenceNumber?.trim() ||
      `AUR-2026-${crypto.randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase()}`;

    const row: WaitlistApplication = {
      fullName: entry.fullName.trim(),
      email,
      phone: entry.phone.trim(),
      company: entry.company?.trim() || undefined,
      profession: entry.profession.trim(),
      wealthNature: entry.wealthNature?.trim() || undefined,
      wealthConcern: entry.wealthConcern?.trim() || undefined,
      netWorthBand: entry.netWorthBand?.trim() || undefined,
      city: entry.city?.trim() || undefined,
      hasCA: entry.hasCA,
      hasLawyer: entry.hasLawyer,
      applicationNote: entry.applicationNote?.trim() || undefined,
      hearAbout: entry.hearAbout?.trim() || undefined,
      whyAccess: entry.whyAccess?.trim() || entry.applicationNote?.trim() || undefined,
      referenceNumber,
      emailVerifiedAt: entry.emailVerifiedAt,
      id: `wl-${crypto.randomUUID()}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    store.waitlist.unshift(row);
    return { ok: true as const, id: row.id, reference: referenceNumber };
  });
}
