import { createFileRoute } from "@tanstack/react-router";
import { completeOnboarding } from "@/lib/auth/service.server";
import { appendCookies, setAuthCookies } from "@/lib/auth/cookies.server";
import { createAuthSession } from "@/lib/auth/member-tokens.server";
import { normalizeInviteInput } from "@/lib/auth/store.server";
import { isCompleteInviteCode } from "@/lib/auth/invite-code";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          password?: string;
          inviteCode?: string;
          fullName?: string;
        };

        const email = body.email?.trim().toLowerCase() ?? "";
        const password = body.password ?? "";
        const inviteCode = body.inviteCode?.trim() ?? "";

        if (!email.includes("@")) {
          return Response.json({ error: "Enter a valid email address." }, { status: 400 });
        }
        if (!password || password.length < 8) {
          return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
        }
        if (!inviteCode) {
          return Response.json({ error: "Invite code is required." }, { status: 400 });
        }

        const normalizedCode = normalizeInviteInput(inviteCode);
        if (!isCompleteInviteCode(normalizedCode)) {
          return Response.json({ error: "Enter a complete invitation code." }, { status: 400 });
        }

        const fullName =
          body.fullName?.trim() ||
          email
            .split("@")[0]
            ?.replace(/[._-]+/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()) ||
          "Member";

        const result = await completeOnboarding({
          code: normalizedCode,
          email,
          fullName,
          password,
          cookieHeader: request.headers.get("cookie"),
        });

        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        const tokens = await createAuthSession({
          memberId: result.sessionId,
          memberEmail: result.session.email,
          rememberDevice: true,
        });

        return appendCookies(Response.json({ ok: true, session: result.session }), [
          ...setAuthCookies({
            memberId: result.sessionId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            rememberDevice: true,
          }),
        ]);
      },
    },
  },
});
