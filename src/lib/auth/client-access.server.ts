import type { MemberSession, PublicSession } from "./types";
import { memberToPublicSession } from "./service.server";
import { mutateStore } from "./store.server";
import { verifyEmailOtp } from "./otp.store.server";

const CLIENT_INVITE_CODE_ID = "email-verified-client";
const CLIENT_SESSION_DAYS = 30;

export async function verifyOtpAndCreateClientSession(input: {
  email: string;
  otp: string;
  firstName: string;
}): Promise<
  | { ok: true; sessionId: string; session: PublicSession }
  | { ok: false; error: string; code?: string }
> {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const otp = input.otp.trim();

  console.info("[Aurelius] Client verify — checking OTP", { email, otpLength: otp.length });

  const verified = await verifyEmailOtp(email, otp);
  if (!verified.ok) {
    console.warn("[Aurelius] Client verify — OTP rejected", { email, code: verified.code });
    return { ok: false, error: verified.error, code: verified.code };
  }

  console.info("[Aurelius] Client verify — OTP valid, provisioning workspace", { email });

  const result = await mutateStore((store) => {
    const existingFull = store.members.find((m) => m.email === email && !m.revoked && !m.isDemo);
    if (existingFull) {
      existingFull.fullName = firstName;
      existingFull.firstName = firstName;
      existingFull.onboardingComplete = true;
      return { ok: true as const, sessionId: existingFull.id, member: existingFull };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CLIENT_SESSION_DAYS);

    let member = store.members.find((m) => m.email === email && m.isDemo);
    if (member) {
      member.isDemo = false;
      member.firstName = firstName;
      member.fullName = firstName;
      member.onboardingComplete = true;
      member.expiresAt = expiresAt.toISOString();
      delete member.aiQuotaDaily;
      return { ok: true as const, sessionId: member.id, member };
    }

    const sessionId = `client-${crypto.randomUUID()}`;
    const newMember: MemberSession = {
      id: sessionId,
      email,
      fullName: firstName,
      firstName,
      tier: "principal",
      role: "member",
      inviteCodeId: CLIENT_INVITE_CODE_ID,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      onboardingComplete: true,
      subscription: "active",
      subscriptionPlan: "Client Preview",
    };

    store.members.push(newMember);
    return { ok: true as const, sessionId, member: newMember };
  });

  const session = memberToPublicSession(result.member);
  console.info("[Aurelius] Client verify — session ready", { email, sessionId: result.sessionId });

  return { ok: true, sessionId: result.sessionId, session };
}
