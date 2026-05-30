import { createFileRoute } from "@tanstack/react-router";
import { completeOnboarding } from "@/lib/auth/service.server";
import {
  appendCookies,
  clearPendingInviteCookie,
  getPendingInviteCode,
  setMemberSessionCookie,
} from "@/lib/auth/cookies.server";
import { normalizeInviteInput } from "@/lib/auth/store.server";

export const Route = createFileRoute("/api/auth/onboard")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          code?: string;
          email?: string;
          fullName?: string;
          password?: string;
        };

        const cookieHeader = request.headers.get("cookie");
        const code = body.code?.trim() || getPendingInviteCode(cookieHeader) || "";

        if (!code) {
          return Response.json({ error: "Invitation code is required." }, { status: 400 });
        }

        const result = await completeOnboarding({
          code: normalizeInviteInput(code),
          email: body.email ?? "",
          fullName: body.fullName ?? "",
          password: body.password,
          cookieHeader,
        });

        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        return appendCookies(Response.json({ ok: true, session: result.session }), [
          setMemberSessionCookie(result.sessionId),
          clearPendingInviteCookie(),
        ]);
      },
    },
  },
});
