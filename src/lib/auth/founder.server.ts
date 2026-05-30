import type { AuthStore, MemberSession } from "./types";
import { hashPassword } from "./password.server";

export const FOUNDER_EMAIL = "rishav@aureliuss.ai";
export const FOUNDER_ID = "mem-founder-super-admin";
export const FOUNDER_NAME = "Rishav Aggarwal";

export function isFounderEmail(email: string): boolean {
  return email.trim().toLowerCase() === FOUNDER_EMAIL;
}

export function getFounderPassword(): string {
  return process.env.AURELIUSS_FOUNDER_PASSWORD ?? "aureliuss-founder-dev-change-me";
}

export function isSuperAdmin(member: { email: string; role?: string; revoked?: boolean } | null | undefined): boolean {
  if (!member || member.revoked) return false;
  return member.role === "SUPER_ADMIN" || isFounderEmail(member.email);
}

export function createFounderMember(): MemberSession {
  const farFuture = new Date("2099-12-31T23:59:59.000Z");
  return {
    id: FOUNDER_ID,
    email: FOUNDER_EMAIL,
    fullName: FOUNDER_NAME,
    tier: "founding",
    role: "SUPER_ADMIN",
    inviteCodeId: "system-founder",
    createdAt: new Date().toISOString(),
    expiresAt: farFuture.toISOString(),
    passwordHash: hashPassword(getFounderPassword()),
    subscription: "active",
    subscriptionPlan: "founding-unlimited",
    revoked: false,
  };
}

/** Ensures the permanent founder account exists and cannot be demoted. Returns true if store was mutated. */
export function ensureFounderAccount(store: AuthStore): boolean {
  let founder = store.members.find((m) => m.id === FOUNDER_ID || isFounderEmail(m.email));

  if (!founder) {
    store.members.unshift(createFounderMember());
    return true;
  }

  let changed = false;
  if (founder.id !== FOUNDER_ID) {
    founder.id = FOUNDER_ID;
    changed = true;
  }
  if (founder.email !== FOUNDER_EMAIL) {
    founder.email = FOUNDER_EMAIL;
    changed = true;
  }
  if (founder.fullName !== FOUNDER_NAME) {
    founder.fullName = FOUNDER_NAME;
    changed = true;
  }
  if (founder.role !== "SUPER_ADMIN") {
    founder.role = "SUPER_ADMIN";
    changed = true;
  }
  if (founder.revoked) {
    founder.revoked = false;
    changed = true;
  }
  if (founder.tier !== "founding") {
    founder.tier = "founding";
    changed = true;
  }
  if (founder.subscription !== "active") {
    founder.subscription = "active";
    changed = true;
  }
  if (!founder.passwordHash) {
    founder.passwordHash = hashPassword(getFounderPassword());
    changed = true;
  }
  if (new Date(founder.expiresAt).getTime() < new Date("2090-01-01").getTime()) {
    founder.expiresAt = new Date("2099-12-31T23:59:59.000Z").toISOString();
    changed = true;
  }

  return changed;
}
