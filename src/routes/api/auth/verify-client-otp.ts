import { createFileRoute } from "@tanstack/react-router";
import { verifyOtpAndCreateClientSession } from "@/lib/auth/client-access.server";
import { appendCookies, setMemberSessionCookie } from "@/lib/auth/cookies.server";

export const Route = createFileRoute("/api/auth/verify-client-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.info("[Aurelius] POST /api/auth/verify-client-otp hit");

        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          otp?: string;
          firstName?: string;
        };

        const result = await verifyOtpAndCreateClientSession({
          email: body.email?.trim().toLowerCase() ?? "",
          otp: body.otp?.trim() ?? "",
          firstName: body.firstName?.trim() ?? "",
        });

        if (!result.ok) {
          return Response.json(
            { ok: false, error: result.error, code: result.code ?? "INVALID_OTP" },
            { status: 400 },
          );
        }

        return appendCookies(
          Response.json({
            ok: true,
            message: "User verified",
            session: result.session,
          }),
          [setMemberSessionCookie(result.sessionId)],
        );
      },
    },
  },
});
