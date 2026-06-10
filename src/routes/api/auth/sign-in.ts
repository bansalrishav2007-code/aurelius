import { createFileRoute } from "@tanstack/react-router";
import { logAuditEvent } from "@/lib/audit/store.server";
import { signInMember } from "@/lib/auth/service.server";
import { appendCookies, setAuthCookies } from "@/lib/auth/cookies.server";
import { createAuthSession } from "@/lib/auth/member-tokens.server";
import { issueEmailOtp, verifyEmailOtp } from "@/lib/auth/otp.store.server";
import { sendAureliusEmail } from "@/lib/email/send.server";
import {
  isAccountEmergencyLocked,
  isDeviceTrusted,
  linkAuthSessionOnLogin,
  recordLogin,
  trustCurrentDevice,
  unlockEmergencyAccount,
  verifyTwoFactorCode,
  getTwoFactorStatus,
} from "@/lib/security/store.server";

export const Route = createFileRoute("/api/auth/sign-in")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          password?: string;
          otp?: string;
          totpCode?: string;
          rememberDevice?: boolean;
          unlockToken?: string;
        };

        if (body.unlockToken && body.email?.trim()) {
          const unlocked = await unlockEmergencyAccount(body.email, body.unlockToken);
          if (!unlocked.ok) {
            return Response.json({ error: unlocked.error }, { status: 400 });
          }
          return Response.json({ ok: true, unlocked: true, message: "Account unlocked. You may sign in now." });
        }
        if (!body.email?.trim()) {
          return Response.json({ error: "Email is required." }, { status: 400 });
        }

        if (await isAccountEmergencyLocked(body.email)) {
          return Response.json(
            { error: "Account is emergency locked. Check your email to unlock." },
            { status: 403 },
          );
        }

        const result = await signInMember(body.email, body.password);
        if (!result.ok) {
          await recordLogin(request, body.email, false);
          return Response.json({ error: result.error }, { status: 403 });
        }

        const profile = await getTwoFactorStatus(result.session.email);
        const trusted = await isDeviceTrusted(request, result.session.email);
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          undefined;

        if (profile?.twoFactorEnabled && !trusted) {
          if (!body.totpCode) {
            return Response.json({
              ok: false,
              requires2fa: true,
              method: profile.twoFactorMethod ?? "authenticator",
              maskedMobile: profile.registeredMobile
                ? profile.registeredMobile.replace(/(\d{2})\d+(\d{2})/, "$1••••$2")
                : undefined,
            });
          }
          const valid = await verifyTwoFactorCode(result.session.email, body.totpCode);
          if (!valid) {
            await recordLogin(request, body.email, false);
            return Response.json({ error: "Invalid two-factor code." }, { status: 403 });
          }
        }

        if (!trusted && !body.otp) {
          const issued = await issueEmailOtp(result.session.email);
          if (!issued.ok) {
            return Response.json({ error: issued.error, retryAfterSeconds: issued.retryAfterSeconds }, { status: 429 });
          }
          await sendAureliusEmail({
            to: result.session.email,
            subject: "Your Aurelius sign-in code",
            text: `Your verification code is ${issued.otp}. It expires in 10 minutes.`,
          }).catch(() => undefined);

          return Response.json({
            ok: false,
            requiresOtp: true,
            maskedMobile: profile?.registeredMobile
              ? profile.registeredMobile.replace(/(\d{2})\d+(\d{2})/, "$1••••$2")
              : undefined,
            message: "Verification code sent to your registered email.",
          });
        }

        if (!trusted && body.otp) {
          const verified = await verifyEmailOtp(result.session.email, body.otp);
          if (!verified.ok) {
            await recordLogin(request, body.email, false);
            return Response.json({ error: verified.error }, { status: 403 });
          }
        }

        const tokens = await createAuthSession({
          memberId: result.sessionId,
          memberEmail: result.session.email,
          rememberDevice: body.rememberDevice === true,
          ip,
          userAgent: request.headers.get("user-agent") ?? undefined,
        });

        await linkAuthSessionOnLogin(request, result.session.email, tokens.sessionId);
        await recordLogin(request, body.email, true, result.sessionId);

        if (body.rememberDevice === true) {
          await trustCurrentDevice(request, result.session.email, 30);
        }
        await logAuditEvent({
          memberId: result.sessionId,
          memberEmail: result.session.email,
          action: "login",
          resourceType: "session",
          detail: "Member signed in",
          ip,
          severity: "info",
        });

        return appendCookies(Response.json({ ok: true, session: result.session }), [
          ...setAuthCookies({
            memberId: result.sessionId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            rememberDevice: body.rememberDevice,
          }),
        ]);
      },
    },
  },
});
