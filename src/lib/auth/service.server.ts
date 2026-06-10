import type { InviteCode, PublicInvitePreview, PublicMember, PublicSession } from "./types";
import {
  generateUniqueInviteCode,
  mutateStore,
  normalizeInviteInput,
  readStore,
  refreshInviteStatuses,
} from "./store.server";
import {
  getAdminSessionId,
  getMemberSessionId,
  getPendingInviteCode,
} from "./cookies.server";
import { generateResetToken, hashPassword, verifyPassword } from "./password.server";
import { isFounderEmail, isSuperAdmin } from "./founder.server";

const ADMIN_KEY =
  process.env.AURELIUS_ADMIN_KEY ?? process.env.AURELIUSS_ADMIN_KEY ?? "aurelius-dev-admin-change-me";

export function memberToPublicSession(member: {
  email: string;
  fullName: string;
  tier: InviteCode["tier"];
  role?: PublicSession["role"];
  subscription?: PublicSession["subscription"];
  onboardingComplete?: boolean;
  onboardingChecklist?: PublicSession["onboardingChecklist"];
  dashboardUnlocked?: boolean;
  isDemo?: boolean;
  devBypass?: boolean;
  firstName?: string;
  profession?: string;
  firm?: string;
  aiQuotaDaily?: number;
}): PublicSession {
  const legacyOnboarded = member.onboardingComplete ?? true;
  const checklist = member.onboardingChecklist ?? {
    profileComplete: legacyOnboarded,
    vaultSetup: legacyOnboarded,
    firstAsset: legacyOnboarded,
    introCallBooked: false,
  };
  const dashboardUnlocked =
    member.dashboardUnlocked ?? legacyOnboarded ?? member.devBypass === true;

  return {
    email: member.email,
    fullName: member.fullName,
    tier: member.tier,
    role: isSuperAdmin(member) ? "SUPER_ADMIN" : (member.role ?? "member"),
    subscription: member.subscription,
    onboardingComplete: member.onboardingComplete ?? legacyOnboarded,
    onboardingChecklist: checklist,
    dashboardUnlocked: isSuperAdmin(member) ? true : dashboardUnlocked,
    isDemo: member.isDemo,
    devBypass: member.devBypass,
    firstName: member.firstName ?? member.fullName.split(/\s+/)[0],
    profession: member.profession,
    firm: member.firm,
    aiQuotaDaily: member.isDemo ? (member.aiQuotaDaily ?? 5) : undefined,
  };
}

async function getMemberFromCookie(cookieHeader: string | null) {
  const sessionId = getMemberSessionId(cookieHeader);
  if (!sessionId) return null;
  const store = await readStore();
  return store.members.find((m) => m.id === sessionId) ?? null;
}

function findInvite(store: Awaited<ReturnType<typeof readStore>>, code: string): InviteCode | undefined {
  refreshInviteStatuses(store.invites);
  const normalized = normalizeInviteInput(code);
  return store.invites.find((i) => normalizeInviteInput(i.code) === normalized);
}

export function validateInvite(invite: InviteCode | undefined, email?: string): PublicInvitePreview {
  if (!invite) {
    return { valid: false, error: "This invitation code is not recognised." };
  }
  refreshInviteStatuses([invite]);
  if (invite.status === "revoked") {
    return { valid: false, error: "This invitation has been withdrawn." };
  }
  if (invite.status === "expired") {
    return { valid: false, error: "This invitation has expired." };
  }
  if (invite.status === "used" || invite.useCount >= invite.maxUses) {
    return { valid: false, error: "This invitation has already been claimed." };
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (invite.assignedEmail && normalizedEmail) {
    if (normalizedEmail !== invite.assignedEmail.toLowerCase()) {
      return {
        valid: false,
        error: "This invitation was issued to a different email address. Use the email from your approval letter.",
      };
    }
  } else if (invite.assignedEmail && !normalizedEmail) {
    return {
      valid: false,
      error: "Enter the email address your invitation was sent to.",
    };
  }

  return {
    valid: true,
    tier: invite.tier,
    label: invite.label,
    expiresAt: invite.expiresAt,
    assignedEmail: invite.assignedEmail,
  };
}

export async function previewInviteCode(code: string, email?: string): Promise<PublicInvitePreview> {
  const store = await readStore();
  return validateInvite(findInvite(store, code), email);
}

export async function resolveMemberSession(cookieHeader: string | null): Promise<PublicSession | null> {
  const sessionId = getMemberSessionId(cookieHeader);
  if (!sessionId) return null;

  const store = await readStore();
  const session = store.members.find((m) => m.id === sessionId);
  if (!session) return null;
  if (session.revoked) return null;
  if (session.suspended && !isSuperAdmin(session)) return null;
  if (!isSuperAdmin(session) && new Date(session.expiresAt).getTime() < Date.now()) return null;

  const publicSession = memberToPublicSession(session);
  if (!session.isDemo) return publicSession;

  const { enrichDemoSession } = await import("@/lib/demo/service.server");
  return enrichDemoSession(publicSession, session);
}

/** Resolve unique member ID from session cookie — used for per-user data isolation. */
export async function resolveMemberId(cookieHeader: string | null): Promise<string | null> {
  const sessionId = getMemberSessionId(cookieHeader);
  if (!sessionId) return null;
  const store = await readStore();
  const session = store.members.find((m) => m.id === sessionId);
  if (!session || session.revoked) return null;
  if (!isSuperAdmin(session) && new Date(session.expiresAt).getTime() < Date.now()) return null;
  return session.id;
}

export async function hasSuperAdminAccess(cookieHeader: string | null): Promise<boolean> {
  const member = await getMemberFromCookie(cookieHeader);
  return isSuperAdmin(member);
}

export async function resolveAdminSession(cookieHeader: string | null): Promise<boolean> {
  const sessionId = getAdminSessionId(cookieHeader);
  if (sessionId) {
    const store = await readStore();
    const session = store.admins.find((a) => a.id === sessionId);
    if (session && new Date(session.expiresAt).getTime() > Date.now()) return true;
  }

  const member = await getMemberFromCookie(cookieHeader);
  return isSuperAdmin(member);
}

export async function verifyAdminKey(key: string): Promise<boolean> {
  return key === ADMIN_KEY;
}

export async function createAdminSession(): Promise<string> {
  const id = `adm-${crypto.randomUUID()}`;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);

  await mutateStore((store) => {
    store.admins.push({
      id,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  });

  return id;
}

export async function completeOnboarding(opts: {
  code: string;
  email: string;
  fullName: string;
  password?: string;
  cookieHeader: string | null;
}): Promise<{ ok: true; sessionId: string; session: PublicSession } | { ok: false; error: string }> {
  const email = opts.email.trim().toLowerCase();
  const fullName = opts.fullName.trim();
  if (!email || !fullName) {
    return { ok: false, error: "Name and email are required." };
  }
  if (opts.password && opts.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  return mutateStore((store) => {
    const invite = findInvite(store, opts.code);
    const preview = validateInvite(invite, email);
    if (!preview.valid || !invite) {
      return { ok: false as const, error: preview.error ?? "Invalid invitation." };
    }

    if (invite.assignedEmail && invite.assignedEmail.toLowerCase() !== email) {
      return {
        ok: false as const,
        error: "Your email does not match this invitation. Use the address from your approval email.",
      };
    }

    const existing = store.members.find((m) => m.email === email);
    if (existing) {
      if (existing.revoked) {
        return { ok: false as const, error: "This membership has been revoked." };
      }
      if (opts.password && !existing.passwordHash) {
        existing.passwordHash = hashPassword(opts.password);
      }
      return {
        ok: true as const,
        sessionId: existing.id,
        session: memberToPublicSession(existing),
      };
    }

    invite.useCount += 1;
    invite.usedBy = [...(invite.usedBy ?? []), email];
    if (invite.useCount >= invite.maxUses) invite.status = "used";
    refreshInviteStatuses(store.invites);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const sessionId = `mem-${crypto.randomUUID()}`;
    store.members.push({
      id: sessionId,
      email,
      fullName,
      tier: invite.tier,
      inviteCodeId: invite.id,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      passwordHash: opts.password ? hashPassword(opts.password) : undefined,
      subscription: invite.tier === "founding" ? "active" : "none",
      onboardingComplete: false,
      dashboardUnlocked: false,
      onboardingChecklist: {
        profileComplete: false,
        vaultSetup: false,
        firstAsset: false,
        introCallBooked: false,
      },
    });

    return {
      ok: true as const,
      sessionId,
      session: memberToPublicSession({
        email,
        fullName,
        tier: invite.tier,
        subscription: invite.tier === "founding" ? "active" : "none",
      }),
    };
  });
}

export async function signInMember(
  email: string,
  password?: string,
): Promise<{ ok: true; sessionId: string; session: PublicSession } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  const store = await readStore();
  const member = store.members.find((m) => m.email === normalized);
  if (!member) {
    if (isFounderEmail(normalized)) {
      return { ok: false, error: "Founder account is being provisioned. Restart the server and try again." };
    }
    return { ok: false, error: "No private membership found for this email. Use your invitation code to apply." };
  }
  if ((member.revoked || member.suspended) && !isSuperAdmin(member)) {
    return { ok: false, error: "Your membership has been suspended. Contact the private office." };
  }
  if (!isSuperAdmin(member) && new Date(member.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: "Your session has expired. Please sign in again with your invitation." };
  }
  if (member.passwordHash) {
    if (!password) {
      return { ok: false, error: "Password is required for this account." };
    }
    if (!verifyPassword(password, member.passwordHash)) {
      return { ok: false, error: "Invalid credentials." };
    }
  }
  return {
    ok: true,
    sessionId: member.id,
    session: memberToPublicSession(member),
  };
}

export async function updateMemberProfile(
  email: string,
  updates: { fullName?: string },
): Promise<{ ok: true; session: PublicSession } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  const fullName = updates.fullName?.trim();
  if (!fullName) return { ok: false, error: "Name is required." };

  return mutateStore((store) => {
    const member = store.members.find((m) => m.email === normalized);
    if (!member || member.revoked) {
      return { ok: false as const, error: "Member not found." };
    }
    member.fullName = fullName;
    return { ok: true as const, session: memberToPublicSession(member) };
  });
}

export async function getMemberProfile(email: string) {
  const store = await readStore();
  const member = store.members.find((m) => m.email === email.toLowerCase());
  if (!member) return null;
  return {
    email: member.email,
    fullName: member.fullName,
    tier: member.tier,
    role: isSuperAdmin(member) ? "SUPER_ADMIN" as const : member.role ?? "member",
    subscription: member.subscription ?? "none",
    subscriptionPlan: member.subscriptionPlan,
    createdAt: member.createdAt,
    expiresAt: member.expiresAt,
    onboardingComplete: member.onboardingComplete ?? true,
    profession: member.profession,
    firm: member.firm,
  };
}

export async function completeMemberOnboarding(
  email: string,
  body: { fullName?: string; profession?: string; firm?: string },
): Promise<{ ok: true; session: PublicSession } | { ok: false; error: string }> {
  return mutateStore((store) => {
    const member = store.members.find((m) => m.email === email.toLowerCase());
    if (!member || member.revoked) {
      return { ok: false as const, error: "Member not found." };
    }
    if (body.fullName?.trim()) member.fullName = body.fullName.trim();
    if (body.profession !== undefined) member.profession = body.profession.trim() || undefined;
    if (body.firm !== undefined) member.firm = body.firm.trim() || undefined;
    member.onboardingComplete = true;
    member.onboardingChecklist = {
      ...(member.onboardingChecklist ?? {
        profileComplete: false,
        vaultSetup: false,
        firstAsset: false,
        introCallBooked: false,
      }),
      profileComplete: true,
    };
    return { ok: true as const, session: memberToPublicSession(member) };
  });
}

export async function requestPasswordReset(email: string): Promise<{ ok: true; devToken?: string } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  return mutateStore((store) => {
    const member = store.members.find((m) => m.email === normalized);
    if (!member) {
      return { ok: true as const, devToken: undefined };
    }
    const token = generateResetToken();
    member.resetToken = token;
    member.resetTokenExpires = new Date(Date.now() + 3_600_000).toISOString();
    return { ok: true as const, devToken: process.env.NODE_ENV !== "production" ? token : undefined };
  });
}

export async function changeMemberPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true; memberId: string } | { ok: false; error: string }> {
  if (newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }
  const normalized = email.trim().toLowerCase();
  const store = await readStore();
  const member = store.members.find((m) => m.email === normalized);
  if (!member?.passwordHash) {
    return { ok: false, error: "Password not set for this account." };
  }
  if (!verifyPassword(currentPassword, member.passwordHash)) {
    return { ok: false, error: "Current password is incorrect." };
  }
  member.passwordHash = hashPassword(newPassword);
  await writeStore(store);
  return { ok: true, memberId: member.id };
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  return mutateStore((store) => {
    const member = store.members.find(
      (m) => m.resetToken === token && m.resetTokenExpires && new Date(m.resetTokenExpires).getTime() > Date.now(),
    );
    if (!member) {
      return { ok: false as const, error: "Invalid or expired reset link." };
    }
    member.passwordHash = hashPassword(newPassword);
    member.resetToken = undefined;
    member.resetTokenExpires = undefined;
    return { ok: true as const, memberId: member.id };
  }).then(async (result) => {
    if (!result.ok) return { ok: false as const, error: result.error };
    if ("memberId" in result && typeof result.memberId === "string") {
      const { revokeAllMemberSessions } = await import("./member-tokens.server");
      await revokeAllMemberSessions(result.memberId);
    }
    return { ok: true as const };
  });
}

export async function listMembers(): Promise<PublicMember[]> {
  const store = await readStore();
  return store.members.map((m) => ({
    id: m.id,
    email: m.email,
    fullName: m.fullName,
    tier: m.tier,
    role: isSuperAdmin(m) ? "SUPER_ADMIN" : m.role ?? "member",
    createdAt: m.createdAt,
    subscription: m.subscription,
    subscriptionPlan: m.subscriptionPlan,
    revoked: m.revoked,
  }));
}

export async function revokeMember(memberId: string): Promise<boolean> {
  return mutateStore((store) => {
    const member = store.members.find((m) => m.id === memberId);
    if (!member || isSuperAdmin(member)) return false;
    member.revoked = true;
    return true;
  });
}

export async function updateMemberSubscription(
  memberId: string,
  subscription: NonNullable<PublicSession["subscription"]>,
  plan?: string,
): Promise<boolean> {
  return mutateStore((store) => {
    const member = store.members.find((m) => m.id === memberId);
    if (!member) return false;
    member.subscription = subscription;
    if (plan) member.subscriptionPlan = plan;
    return true;
  });
}

export async function createInvite(opts: {
  label?: string;
  tier: InviteCode["tier"];
  maxUses: number;
  expiresInDays: number | null;
  notes?: string;
  assignedEmail?: string;
}): Promise<InviteCode> {
  const assignedEmail = opts.assignedEmail?.trim().toLowerCase();
  if (assignedEmail && !assignedEmail.includes("@")) {
    throw new Error("A valid client email is required to bind this access code.");
  }

  return mutateStore((store) => {
    const expiresAt =
      opts.expiresInDays == null
        ? null
        : new Date(Date.now() + opts.expiresInDays * 86_400_000).toISOString();

    const invite: InviteCode = {
      id: `inv-${crypto.randomUUID()}`,
      code: generateUniqueInviteCode(store.invites.map((i) => i.code)),
      label: opts.label,
      tier: opts.tier,
      maxUses: Math.max(1, opts.maxUses),
      useCount: 0,
      expiresAt,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: "admin",
      notes: opts.notes,
      usedBy: [],
      assignedEmail: assignedEmail || undefined,
    };
    store.invites.unshift(invite);
    return invite;
  });
}

export async function revokeInvite(id: string): Promise<boolean> {
  return mutateStore((store) => {
    const inv = store.invites.find((i) => i.id === id);
    if (!inv) return false;
    inv.status = "revoked";
    return true;
  });
}

export async function getPendingInviteFromCookie(cookieHeader: string | null): Promise<string | undefined> {
  const code = getPendingInviteCode(cookieHeader);
  if (!code) return undefined;
  const preview = await previewInviteCode(code);
  return preview.valid ? code : undefined;
}

export async function destroyAdminSession(sessionId: string): Promise<void> {
  await mutateStore((store) => {
    store.admins = store.admins.filter((a) => a.id !== sessionId);
  });
}

export async function approveWaitlistApplication(
  waitlistId: string,
  opts?: { tier?: InviteCode["tier"]; expiresInDays?: number | null },
): Promise<
  | {
      ok: true;
      invite: InviteCode;
      application: import("./types").WaitlistApplication;
      emailResult: import("@/lib/email/invite.server").SendInvitationResult;
    }
  | { ok: false; error: string }
> {
  const tierLabels = {
    founding: "Founding circle",
    principal: "Principal membership",
    "family-office": "Family office charter",
  };

  const prepared = await mutateStore((store) => {
    const entry = store.waitlist.find((w) => w.id === waitlistId);
    if (!entry) return { ok: false as const, error: "Application not found." };
    if (entry.status === "approved") {
      return { ok: false as const, error: "Application already approved." };
    }
    if (entry.status === "declined") {
      return { ok: false as const, error: "Application was declined." };
    }

    const expiresInDays = opts?.expiresInDays ?? 30;
    const expiresAt =
      expiresInDays == null ? null : new Date(Date.now() + expiresInDays * 86_400_000).toISOString();

    const invite: InviteCode = {
      id: `inv-${crypto.randomUUID()}`,
      code: generateUniqueInviteCode(store.invites.map((i) => i.code)),
      label: `${entry.fullName} — private allocation`,
      tier: opts?.tier ?? "principal",
      maxUses: 1,
      useCount: 0,
      expiresAt,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: "admin",
      notes: `Waitlist approval · ${entry.email}`,
      usedBy: [],
      assignedEmail: entry.email.toLowerCase(),
      waitlistId: entry.id,
    };

    entry.status = "approved";
    entry.reviewedAt = new Date().toISOString();
    entry.inviteCodeId = invite.id;
    entry.inviteCode = invite.code;

    store.invites.unshift(invite);
    return { ok: true as const, invite, application: { ...entry } };
  });

  if (!prepared.ok) return prepared;

  const { sendMembershipApprovedEmail } = await import("@/lib/email/application.server");
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

  if (emailResult.sent) {
    await mutateStore((store) => {
      const entry = store.waitlist.find((w) => w.id === waitlistId);
      if (entry) entry.invitationSentAt = new Date().toISOString();
    });
  }

  return { ok: true, ...prepared, emailResult };
}

export async function declineWaitlistApplication(waitlistId: string, reason?: string): Promise<boolean> {
  return mutateStore((store) => {
    const entry = store.waitlist.find((w) => w.id === waitlistId);
    if (!entry) return false;
    entry.status = "declined";
    entry.reviewedAt = new Date().toISOString();
    if (reason) entry.declineReason = reason;
    return true;
  });
}

export async function getAdminDashboardData() {
  const store = await readStore();
  refreshInviteStatuses(store.invites);
  const { getMembershipAdminStats } = await import("@/lib/membership/service.server");
  const { getMembershipSettings } = await import("@/lib/membership/settings.server");
  const membership = await getMembershipAdminStats();
  const settings = await getMembershipSettings();
  return {
    invites: store.invites,
    waitlist: store.waitlist,
    memberCount: store.members.filter((m) => !m.revoked).length,
    members: store.members.map((m) => ({
      id: m.id,
      email: m.email,
      fullName: m.fullName,
      tier: m.tier,
      role: isSuperAdmin(m) ? "SUPER_ADMIN" : m.role ?? "member",
      createdAt: m.createdAt,
      subscription: m.subscription,
      subscriptionPlan: m.subscriptionPlan,
      revoked: m.revoked,
      suspended: m.suspended,
    })),
    membership,
    inviteOnlyMode: settings.inviteOnlyMode,
  };
}
