import { createFileRoute } from "@tanstack/react-router";
import { executeOtpSendFlow } from "@/lib/email/otp-flow.server";

export const Route = createFileRoute("/api/waitlist/send-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.info("[Aurelius] POST /api/waitlist/send-otp hit — delegating to OTP flow");

        const body = (await request.json().catch(() => ({}))) as { email?: string; fullName?: string };
        const result = await executeOtpSendFlow({
          email: body.email?.trim().toLowerCase() ?? "",
          fullName: body.fullName,
          source: "waitlist",
        });

        if (!result.ok) {
          return Response.json(
            {
              error: result.error,
              code: result.code,
              retryAfterSeconds: result.retryAfterSeconds,
            },
            { status: result.status },
          );
        }

        return Response.json({
          ok: true,
          expiresAt: result.expiresAt,
          sent: result.sent,
          emailConfigured: result.emailConfigured,
          resendId: result.resendId,
        });
      },
    },
  },
});
