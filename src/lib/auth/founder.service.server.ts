import type { InviteCode, PublicMember, WaitlistApplication } from "./types";
import { mutateStore, readStore, refreshInviteStatuses } from "./store.server";
import { hashPassword } from "./password.server";
import { isSuperAdmin } from "./founder.server";
import { listPayments, getPaymentSummary } from "@/lib/payments/store.server";
import { listSupportTickets } from "@/lib/support/store.server";
import { getUsageSummary } from "@/lib/usage/store.server";

export async function requireSuperAdmin(cookieHeader: string | null): Promise<boolean> {
  const { resolveMemberSession } = await import("./service.server");
  const session = await resolveMemberSession(cookieHeader);
  return session?.role === "SUPER_ADMIN";
}

export async function getFounderOverview() {
  const store = await readStore();
  refreshInviteStatuses(store.invites);
  const payments = await listPayments();
  const support = await listSupportTickets();
  const usage = await getUsageSummary();

  const activeMembers = store.members.filter((m) => !m.revoked);
  const activeSubscriptions = activeMembers.filter((m) => m.subscription === "active").length;
  const pendingApplications = store.waitlist.filter((w) => w.status === "pending").length;
  const paymentSummary = getPaymentSummary(payments);

  return {
    stats: {
      totalUsers: store.members.length,
      totalMembers: activeMembers.length,
      totalRevenuePaise: paymentSummary.totalRevenuePaise,
      totalRevenueCr: paymentSummary.totalRevenueCr,
      activeSubscriptions,
      pendingApplications,
      openTickets: support.filter((t) => t.status === "open").length,
      activeInvites: store.invites.filter((i) => i.status === "active").length,
      totalEvents: usage.totalEvents,
    },
    invites: store.invites,
    waitlist: store.waitlist,
    members: store.members.map((m) => toPublicMember(m)),
    payments,
    paymentSummary,
    support,
    usage,
  };
}

function toPublicMember(m: {
  id: string;
  email: string;
  fullName: string;
  tier: InviteCode["tier"];
  role?: PublicMember["role"];
  createdAt: string;
  subscription?: PublicMember["subscription"];
  subscriptionPlan?: string;
  revoked?: boolean;
}): PublicMember {
  return {
    id: m.id,
    email: m.email,
    fullName: m.fullName,
    tier: m.tier,
    role: isSuperAdmin(m) ? "SUPER_ADMIN" : m.role ?? "member",
    createdAt: m.createdAt,
    subscription: m.subscription,
    subscriptionPlan: m.subscriptionPlan,
    revoked: m.revoked,
  };
}

export async function updateMember(
  memberId: string,
  updates: {
    tier?: InviteCode["tier"];
    role?: PublicMember["role"];
    subscription?: PublicMember["subscription"];
    subscriptionPlan?: string;
    revoked?: boolean;
  },
): Promise<boolean> {
  return mutateStore((store) => {
    const member = store.members.find((m) => m.id === memberId);
    if (!member || isSuperAdmin(member)) return false;
    if (updates.tier) member.tier = updates.tier;
    if (updates.role && updates.role !== "SUPER_ADMIN") member.role = updates.role;
    if (updates.subscription) member.subscription = updates.subscription;
    if (updates.subscriptionPlan !== undefined) member.subscriptionPlan = updates.subscriptionPlan;
    if (updates.revoked !== undefined) member.revoked = updates.revoked;
    return true;
  });
}

export async function deleteMember(memberId: string): Promise<boolean> {
  return mutateStore((store) => {
    const idx = store.members.findIndex((m) => m.id === memberId);
    if (idx === -1) return false;
    if (isSuperAdmin(store.members[idx])) return false;
    store.members.splice(idx, 1);
    return true;
  });
}

export async function createAdminAccount(opts: {
  email: string;
  fullName: string;
  password: string;
  role?: "ADMIN" | "member";
}): Promise<PublicMember | { error: string }> {
  const email = opts.email.trim().toLowerCase();
  if (!email || !opts.fullName.trim()) return { error: "Email and name are required." };
  if (opts.password.length < 8) return { error: "Password must be at least 8 characters." };

  return mutateStore((store) => {
    if (store.members.some((m) => m.email === email)) {
      return { error: "An account with this email already exists." };
    }
    const farFuture = new Date("2099-12-31T23:59:59.000Z");
    const member = {
      id: `mem-${crypto.randomUUID()}`,
      email,
      fullName: opts.fullName.trim(),
      tier: "founding" as const,
      role: (opts.role ?? "ADMIN") as "ADMIN",
      inviteCodeId: "system-admin",
      createdAt: new Date().toISOString(),
      expiresAt: farFuture.toISOString(),
      passwordHash: hashPassword(opts.password),
      subscription: "active" as const,
      subscriptionPlan: "admin-access",
      revoked: false,
    };
    store.members.push(member);
    return toPublicMember(member);
  });
}

export async function updateWaitlistNotes(waitlistId: string, adminNotes: string): Promise<boolean> {
  return mutateStore((store) => {
    const entry = store.waitlist.find((w) => w.id === waitlistId);
    if (!entry) return false;
    entry.adminNotes = adminNotes.trim();
    return true;
  });
}

export async function declineWaitlistWithReason(waitlistId: string, reason?: string): Promise<boolean> {
  return mutateStore((store) => {
    const entry = store.waitlist.find((w) => w.id === waitlistId);
    if (!entry) return false;
    entry.status = "declined";
    entry.reviewedAt = new Date().toISOString();
    if (reason) entry.declineReason = reason.trim();
    return true;
  });
}

export async function createClientAccessCode(opts: {
  label?: string;
  tier: InviteCode["tier"];
  assignedEmail?: string;
  maxUses: number;
  expiresInDays: number | null;
  notes?: string;
}): Promise<InviteCode> {
  const { createInvite } = await import("./service.server");
  return createInvite({
    label: opts.label ?? "Client access code",
    tier: opts.tier,
    maxUses: opts.maxUses,
    expiresInDays: opts.expiresInDays,
    notes: opts.notes,
    assignedEmail: opts.assignedEmail,
  });
}

export type { WaitlistApplication };
