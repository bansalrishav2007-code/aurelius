import { createFileRoute } from "@tanstack/react-router";
import { executeOtpSendFlow } from "@/lib/email/otp-flow.server";

type SendOtpBody = {
  email?: string;
  otp?: string;
  fullName?: string;
  source?: "api" | "waitlist";
};

export const Route = createFileRoute("/api/send-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.info("[Aurelius] POST /api/send-otp hit");

        let body: SendOtpBody;
        try {
          body = (await request.json()) as SendOtpBody;
        } catch (err) {
          console.error("[Aurelius] /api/send-otp invalid JSON", err);
          return Response.json({ ok: false, error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
        }

        const clientOtp = body.otp?.trim() ?? "";
        if (clientOtp) {
          console.warn("[Aurelius] /api/send-otp rejected client-supplied OTP", { email: body.email });
          return Response.json(
            {
              ok: false,
              error: "OTP must be generated server-side. Send only the email address.",
              code: "CLIENT_OTP_REJECTED",
            },
            { status: 400 },
          );
        }

        const result = await executeOtpSendFlow({
          email: body.email?.trim().toLowerCase() ?? "",
          fullName: body.fullName,
          source: body.source ?? "api",
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
          sent: result.sent,
          expiresAt: result.expiresAt,
          resendId: result.resendId,
          emailConfigured: result.emailConfigured,
        });
      },
    },
  },
});
