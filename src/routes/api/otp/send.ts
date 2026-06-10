import { createFileRoute } from "@tanstack/react-router";
import { executeOtpSendFlow } from "@/lib/email/otp-flow.server";
import { OTP_EXPIRY_MINUTES } from "@/lib/auth/otp.store.server";

export const Route = createFileRoute("/api/otp/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          name?: string;
          fullName?: string;
          otp?: string;
          source?: "api" | "waitlist";
        };

        const email = body.email?.trim().toLowerCase() ?? "";

        if (body.otp?.trim()) {
          console.warn("[Aurelius] POST /api/otp/send rejected — client-supplied OTP", { email });
          return Response.json(
            {
              ok: false,
              error: "OTP must be generated server-side.",
              code: "CLIENT_OTP_REJECTED",
            },
            { status: 400 },
          );
        }

        console.info("[Aurelius] POST /api/otp/send", { email, source: body.source ?? "waitlist" });

        const result = await executeOtpSendFlow({
          email,
          fullName: body.name?.trim() || body.fullName?.trim(),
          source: body.source ?? "waitlist",
        });

        if (!result.ok) {
          return Response.json(
            {
              ok: false,
              error: result.error,
              code: result.code,
              retryAfterSeconds: result.retryAfterSeconds,
            },
            { status: result.status },
          );
        }

        return Response.json({
          ok: true,
          message: "Verification code sent successfully",
          expiresAt: result.expiresAt,
          expiresInMinutes: OTP_EXPIRY_MINUTES,
          sent: result.sent,
          resendId: result.resendId,
          emailConfigured: result.emailConfigured,
        });
      },
    },
  },
});
