import type {
  AdminActivityEntry,
  InviteCode,
  MembershipApplication,
  OnboardingChecklist,
  UpgradeRequest,
} from "@/lib/auth/types";
import {
  generateUniqueInviteCode,
  mutateStore,
  readStore,
} from "@/lib/auth/store.server";
import { listMemberDocuments } from "@/lib/vault/store.server";
import { getOrCreateProfile } from "@/lib/wealth/store.server";

export function defaultChecklist(): OnboardingChecklist {
  return {
    profileComplete: false,
    vaultSetup: false,
    firstAsset: false,
    introCallBooked: false,
  };
}

export function isChecklistComplete(checklist: OnboardingChecklist): boolean {
  return checklist.profileComplete && checklist.vaultSetup && checklist.firstAsset;
}

export async function logAdminActivity(action: string, detail: string, actor?: string): Promise<void> {
  await mutateStore((store) => {
    store.adminActivity = store.adminActivity ?? [];
    store.adminActivity.unshift({
      id: `act-${crypto.randomUUID()}`,
      action,
      detail,
      actor,
      createdAt: new Date().toISOString(),
    });
    store.adminActivity = store.adminActivity.slice(0, 200);
  });
}

export async function submitMembershipApplication(
  input: Omit<MembershipApplication, "id" | "status" | "createdAt">,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  return mutateStore((store) => {
    store.membershipApplications = store.membershipApplications ?? [];
    const email = input.email.trim().toLowerCase();
    const duplicate = store.membershipApplications.some(
      (a) => a.email === email && a.status === "pending",
    );
    if (duplicate) {
      return { ok: false as const, error: "You already have a pending application." };
    }
    const existingMember = store.members.some((m) => m.email === email && !m.revoked);
    if (existingMember) {
      return { ok: false as const, error: "This email is already a member." };
    }

    const row: MembershipApplication = {
      id: `app-${crypto.randomUUID()}`,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      email,
      tierApplying: input.tierApplying,
      netWorthRange: input.netWorthRange,
      primaryNeed: input.primaryNeed,
      hearAbout: input.hearAbout?.trim() || undefined,
      whyAccess: input.whyAccess.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    store.membershipApplications.unshift(row);
    return { ok: true as const, id: row.id };
  });
}

export async function submitWaitlistInterest(input: {
  fullName: string;
  email: string;
  phone: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  return submitMembershipApplication({
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    tierApplying: "principal",
    netWorthRange: "1-5cr",
    primaryNeed: "all",
    whyAccess: "Waitlist interest — invite-only mode",
  });
}

const tierLabels: Record<InviteCode["tier"], string> = {
  founding: "Founder",
  principal: "Principal",
  "family-office": "Family Office",
};

export async function approveMembershipApplication(
  applicationId: string,
  opts?: { tier?: InviteCode["tier"]; expiresInDays?: number | null },
): Promise<
  | {
      ok: true;
      invite: InviteCode;
      application: MembershipApplication;
      emailResult: import("@/lib/email/invite.server").SendInvitationResult;
    }
  | { ok: false; error: string }
> {
  const prepared = await mutateStore((store) => {
    store.membershipApplications = store.membershipApplications ?? [];
    const entry = store.membershipApplications.find((a) => a.id === applicationId);
    if (!entry) return { ok: false as const, error: "Application not found." };
    if (entry.status === "approved") {
      return { ok: false as const, error: "Application already approved." };
    }
    if (entry.status === "rejected") {
      return { ok: false as const, error: "Application was rejected." };
    }

    const tier = opts?.tier ?? entry.tierApplying;
    const expiresInDays = opts?.expiresInDays ?? 30;
    const expiresAt =
      expiresInDays == null ? null : new Date(Date.now() + expiresInDays * 86_400_000).toISOString();

    const invite: InviteCode = {
      id: `inv-${crypto.randomUUID()}`,
      code: generateUniqueInviteCode(store.invites.map((i) => i.code)),
      label: `${entry.fullName} — ${tierLabels[tier]}`,
      tier,
      maxUses: 1,
      useCount: 0,
      expiresAt,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: "admin",
      notes: `Membership application · ${entry.email}`,
      usedBy: [],
      assignedEmail: entry.email.toLowerCase(),
    };

    entry.status = "approved";
    entry.reviewedAt = new Date().toISOString();
    entry.inviteCodeId = invite.id;
    entry.inviteCode = invite.code;

    store.invites.unshift(invite);
    return { ok: true as const, invite, application: { ...entry } };
  });

  if (!prepared.ok) return prepared;

  const { sendMembershipApprovedEmail, sendMembershipRejectedEmail } = await import(
    "@/lib/email/application.server"
  );
  const { buildAccessUrl, sendInvitationEmail } = await import("@/lib/email/invite.server");

  await sendMembershipApprovedEmail({
    to: prepared.application.email,
    fullName: prepared.application.fullName,
  });

  const accessUrl = buildAccessUrl(prepared.invite.code, prepared.application.email);
  const emailResult = await sendInvitationEmail({
    to: prepared.application.email,
    fullName: prepared.application.fullName,
    inviteCode: prepared.invite.code,
    accessUrl,
    expiresAt: prepared.invite.expiresAt,
    tier: tierLabels[prepared.invite.tier],
  });

  await logAdminActivity(
    "application_approved",
    `Approved ${prepared.application.fullName} (${prepared.application.email}) as ${tierLabels[prepared.invite.tier]}`,
  );

  return { ok: true, ...prepared, emailResult };
}

export async function rejectMembershipApplication(
  applicationId: string,
  reason?: string,
): Promise<{ ok: true; application: MembershipApplication } | { ok: false; error: string }> {
  const result = await mutateStore((store) => {
    store.membershipApplications = store.membershipApplications ?? [];
    const entry = store.membershipApplications.find((a) => a.id === applicationId);
    if (!entry) return { ok: false as const, error: "Application not found." };
    if (entry.status === "approved") {
      return { ok: false as const, error: "Cannot reject an approved application." };
    }
    entry.status = "rejected";
    entry.reviewedAt = new Date().toISOString();
    if (reason) entry.adminNotes = reason;
    return { ok: true as const, application: { ...entry } };
  });

  if (!result.ok) return result;

  const { sendMembershipRejectedEmail } = await import("@/lib/email/application.server");
  await sendMembershipRejectedEmail({
    to: result.application.email,
    fullName: result.application.fullName,
  });

  await logAdminActivity(
    "application_rejected",
    `Rejected application from ${result.application.fullName} (${result.application.email})`,
  );

  return result;
}

export async function submitUpgradeRequest(input: {
  memberEmail: string;
  memberName: string;
  currentTier: InviteCode["tier"];
  requestedTier: InviteCode["tier"];
  reason?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  return mutateStore((store) => {
    store.upgradeRequests = store.upgradeRequests ?? [];
    const pending = store.upgradeRequests.some(
      (r) => r.memberEmail === input.memberEmail.toLowerCase() && r.status === "pending",
    );
    if (pending) {
      return { ok: false as const, error: "You already have a pending upgrade request." };
    }
    const row: UpgradeRequest = {
      id: `upg-${crypto.randomUUID()}`,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      currentTier: input.currentTier,
      requestedTier: input.requestedTier,
      reason: input.reason?.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    store.upgradeRequests.unshift(row);
    return { ok: true as const, id: row.id };
  });
}

export async function updateMemberTier(
  memberId: string,
  tier: InviteCode["tier"],
): Promise<boolean> {
  return mutateStore((store) => {
    const member = store.members.find((m) => m.id === memberId);
    if (!member) return false;
    member.tier = tier;
    if (tier === "founding") member.subscription = "active";
    return true;
  });
}

export async function suspendMember(memberId: string, suspended: boolean): Promise<boolean> {
  return mutateStore((store) => {
    const member = store.members.find((m) => m.id === memberId);
    if (!member) return false;
    member.suspended = suspended;
    if (suspended) member.revoked = true;
    else member.revoked = false;
    return true;
  });
}

export async function resolveOnboardingChecklist(
  email: string,
): Promise<OnboardingChecklist & { complete: boolean; unlocked: boolean }> {
  const store = await readStore();
  const member = store.members.find((m) => m.email === email.toLowerCase());
  if (!member) {
    return { ...defaultChecklist(), complete: false, unlocked: false };
  }

  const checklist = { ...(member.onboardingChecklist ?? defaultChecklist()) };

  if (member.onboardingComplete) checklist.profileComplete = true;

  try {
    const docs = await listMemberDocuments(email);
    if (docs.length > 0) checklist.vaultSetup = true;
  } catch {
    /* vault may be empty */
  }

  try {
    const wealth = await getOrCreateProfile(email);
    if (wealth.assets.length > 0) checklist.firstAsset = true;
  } catch {
    /* no wealth data */
  }

  const complete = isChecklistComplete(checklist);
  const unlocked = member.dashboardUnlocked ?? member.onboardingComplete !== false;

  if (complete && !member.dashboardUnlocked && member.onboardingComplete !== false) {
    await mutateStore((s) => {
      const m = s.members.find((x) => x.email === email.toLowerCase());
      if (m) {
        m.onboardingChecklist = checklist;
        m.dashboardUnlocked = true;
      }
    });
    return { ...checklist, complete: true, unlocked: true };
  }

  await mutateStore((s) => {
    const m = s.members.find((x) => x.email === email.toLowerCase());
    if (m) m.onboardingChecklist = checklist;
  });

  return { ...checklist, complete, unlocked: unlocked || complete };
}

export async function markIntroCallBooked(email: string): Promise<void> {
  await mutateStore((store) => {
    const member = store.members.find((m) => m.email === email.toLowerCase());
    if (!member) return;
    member.onboardingChecklist = {
      ...(member.onboardingChecklist ?? defaultChecklist()),
      introCallBooked: true,
    };
  });
}

export async function unlockDashboard(email: string): Promise<boolean> {
  const status = await resolveOnboardingChecklist(email);
  if (!status.complete) return false;
  await mutateStore((store) => {
    const member = store.members.find((m) => m.email === email.toLowerCase());
    if (member) member.dashboardUnlocked = true;
  });
  return true;
}

export async function getMembershipAdminStats() {
  const store = await readStore();
  const apps = store.membershipApplications ?? [];
  const members = store.members.filter((m) => !m.revoked && !m.suspended);
  const byTier = {
    principal: members.filter((m) => m.tier === "principal").length,
    "family-office": members.filter((m) => m.tier === "family-office").length,
    founding: members.filter((m) => m.tier === "founding").length,
  };
  return {
    memberCount: members.length,
    byTier,
    pendingApplications: apps.filter((a) => a.status === "pending").length,
    pendingUpgrades: (store.upgradeRequests ?? []).filter((r) => r.status === "pending").length,
    recentActivity: (store.adminActivity ?? []).slice(0, 20),
    applications: apps,
    upgradeRequests: store.upgradeRequests ?? [],
  };
}
