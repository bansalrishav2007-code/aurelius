import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import {
  acknowledgeSuspiciousLogin,
  changePasswordWithSessions,
  confirmAccountDeletion,
  confirmAuthenticatorSetup,
  disableTwoFactor,
  emergencyLockAccount,
  enableSmsTwoFactor,
  getSecurityDashboard,
  markLoginHistoryReviewed,
  removeTrustedDevice,
  requestAccountDeletion,
  revokeAllOtherSessions,
  revokeSession,
  startAuthenticatorSetup,
  trustCurrentDevice,
  updateSecurityNotificationPrefs,
} from "@/lib/security/store.server";
import { getAuthSessionIdFromRequest } from "@/lib/auth/member-tokens.server";
import type { SecurityNotificationPrefs } from "@/lib/security/types";

export const Route = createFileRoute("/api/member/security")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const dashboard = await getSecurityDashboard(request, auth.session.email, auth.memberId);
        const { totpSecret, totpPendingSecret, backupCodes, deletionConfirmToken, emergencyUnlockToken, ...safeProfile } =
          dashboard.profile;
        return Response.json({
          ...dashboard,
          profile: safeProfile,
        });
      },
      PATCH: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Security settings");
        }

        const body = (await request.json().catch(() => ({}))) as {
          action?: string;
          sessionId?: string;
          code?: string;
          mobile?: string;
          deviceId?: string;
          token?: string;
          skipOtpDays?: number;
          currentPassword?: string;
          newPassword?: string;
          secure?: boolean;
          notificationPrefs?: Partial<SecurityNotificationPrefs>;
          method?: "sms" | "authenticator";
        };

        const email = auth.session.email;
        const name = auth.session.fullName;
        const memberId = auth.memberId;

        switch (body.action) {
          case "revoke_session": {
            if (!body.sessionId) return Response.json({ error: "Session id required." }, { status: 400 });
            const ok = await revokeSession(email, body.sessionId);
            if (!ok) return Response.json({ error: "Session not found." }, { status: 404 });
            return Response.json({ ok: true });
          }
          case "revoke_all_sessions": {
            const count = await revokeAllOtherSessions(request, email, memberId);
            return Response.json({ ok: true, revoked: count });
          }
          case "start_authenticator_setup": {
            const setup = await startAuthenticatorSetup(email);
            return Response.json(setup);
          }
          case "confirm_authenticator_setup": {
            if (!body.code) return Response.json({ error: "Verification code required." }, { status: 400 });
            const result = await confirmAuthenticatorSetup(email, body.code, name);
            if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
            return Response.json({
              profile: result.profile,
              backupCodes: result.backupCodes,
            });
          }
          case "enable_sms_2fa": {
            const profile = await enableSmsTwoFactor(email, body.mobile);
            return Response.json({ profile });
          }
          case "disable_2fa": {
            const profile = await disableTwoFactor(email, body.method);
            return Response.json({ profile });
          }
          case "trust_device": {
            const device = await trustCurrentDevice(request, email, body.skipOtpDays ?? 30);
            return Response.json({ device });
          }
          case "remove_trusted_device": {
            if (!body.deviceId) return Response.json({ error: "Device id required." }, { status: 400 });
            const ok = await removeTrustedDevice(email, body.deviceId);
            if (!ok) return Response.json({ error: "Device not found." }, { status: 404 });
            return Response.json({ ok: true });
          }
          case "request_deletion": {
            const origin = new URL(request.url).origin;
            const result = await requestAccountDeletion(email, name, origin);
            return Response.json(result);
          }
          case "confirm_deletion": {
            if (!body.token) return Response.json({ error: "Confirmation token required." }, { status: 400 });
            const result = await confirmAccountDeletion(email, body.token);
            if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
            return Response.json({ profile: result.profile });
          }
          case "acknowledge_suspicious": {
            const result = await acknowledgeSuspiciousLogin(request, email, body.secure === true, memberId);
            return Response.json(result);
          }
          case "mark_history_reviewed": {
            const profile = await markLoginHistoryReviewed(email);
            return Response.json({ profile });
          }
          case "update_notification_prefs": {
            if (!body.notificationPrefs) {
              return Response.json({ error: "notificationPrefs required." }, { status: 400 });
            }
            const prefs = await updateSecurityNotificationPrefs(email, body.notificationPrefs);
            return Response.json({ notificationPrefs: prefs });
          }
          case "change_password": {
            if (!body.currentPassword || !body.newPassword) {
              return Response.json({ error: "Current and new password required." }, { status: 400 });
            }
            const keepSessionId = await getAuthSessionIdFromRequest(request.headers.get("cookie"));
            const result = await changePasswordWithSessions(
              email,
              body.currentPassword,
              body.newPassword,
              name,
              memberId,
              keepSessionId ?? undefined,
            );
            if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
            return Response.json({ ok: true });
          }
          case "emergency_lock": {
            const origin = new URL(request.url).origin;
            const result = await emergencyLockAccount(email, name, memberId, origin);
            return Response.json(result);
          }
          default:
            return Response.json({ error: "Invalid action." }, { status: 400 });
        }
      },
    },
  },
});
