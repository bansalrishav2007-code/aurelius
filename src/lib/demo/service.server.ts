import type { MemberSession, PublicSession } from "@/lib/auth/types";
import { mutateStore } from "@/lib/auth/store.server";
import { memberToPublicSession } from "@/lib/auth/service.server";
import { getDemoAiUsageToday } from "./quota.server";
import { DEMO_AI_QUOTA_DAILY, DEMO_INVITE_CODE_ID, DEMO_SESSION_DAYS } from "./constants";

export async function enrichDemoSession(session: PublicSession, member: MemberSession): Promise<PublicSession> {
  if (!member.isDemo) return session;

  const limit = member.aiQuotaDaily ?? DEMO_AI_QUOTA_DAILY;
  const used = await getDemoAiUsageToday(member.email);

  return {
    ...session,
    isDemo: true,
    firstName: member.firstName ?? member.fullName.split(/\s+/)[0],
    aiQuotaDaily: limit,
    aiQuotaRemaining: Math.max(0, limit - used),
    demoPurpose: member.demoPurpose,
  };
}

export async function createOrResumeDemoAccount(input: {
  firstName: string;
  email: string;
  purpose?: string;
}): Promise<
  | { ok: true; sessionId: string; session: PublicSession }
  | { ok: false; error: string }
> {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();

  if (!firstName) {
    return { ok: false, error: "Enter your first name." };
  }
  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const result = await mutateStore((store) => {
    const fullMember = store.members.find((m) => m.email === email && !m.revoked);
    if (fullMember && !fullMember.isDemo) {
      return { ok: false as const, error: "This email is registered as a full member. Sign in instead." };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEMO_SESSION_DAYS);

    let member = store.members.find((m) => m.email === email && m.isDemo);

    if (member) {
      member.firstName = firstName;
      member.fullName = firstName;
      member.expiresAt = expiresAt.toISOString();
      if (input.purpose?.trim()) member.demoPurpose = input.purpose.trim();
      return {
        ok: true as const,
        sessionId: member.id,
        member,
      };
    }

    const sessionId = `demo-${crypto.randomUUID()}`;
    const newMember: MemberSession = {
      id: sessionId,
      email,
      fullName: firstName,
      firstName,
      tier: "principal",
      role: "member",
      inviteCodeId: DEMO_INVITE_CODE_ID,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      isDemo: true,
      aiQuotaDaily: DEMO_AI_QUOTA_DAILY,
      onboardingComplete: true,
      subscription: "none",
      demoPurpose: input.purpose?.trim() || undefined,
    };

    store.members.push(newMember);
    return { ok: true as const, sessionId, member: newMember };
  });

  if (!result.ok) return result;

  const session = await enrichDemoSession(memberToPublicSession(result.member), result.member);
  return { ok: true, sessionId: result.sessionId, session };
}

export function demoLockedResponse(feature: string): Response {
  return Response.json(
    {
      error: `${feature} is available with full membership. Upgrade to unlock.`,
      code: "DEMO_LOCKED",
    },
    { status: 403 },
  );
}
