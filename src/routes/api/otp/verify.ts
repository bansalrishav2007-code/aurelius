import { createFileRoute } from "@tanstack/react-router";
import { verifyEmailOtp } from "@/lib/auth/otp.store.server";

export const Route = createFileRoute("/api/otp/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { email?: string; otp?: string };
        const email = body.email?.trim().toLowerCase() ?? "";
        const otp = body.otp?.trim() ?? "";

        console.info("[Aurelius] POST /api/otp/verify", { email, otpLength: otp.length });

        if (!email.includes("@")) {
          return Response.json(
            { ok: false, error: "Enter a valid email address.", code: "INVALID_EMAIL" },
            { status: 400 },
          );
        }

        if (!otp) {
          return Response.json(
            { ok: false, error: "Enter the 6-digit verification code.", code: "INVALID_OTP" },
            { status: 400 },
          );
        }

        const result = await verifyEmailOtp(email, otp);
        if (!result.ok) {
          console.warn("[Aurelius] OTP verification failure", {
            email,
            code: result.code,
            error: result.error,
          });
          return Response.json(
            { ok: false, error: result.error, code: result.code ?? "INVALID_OTP" },
            { status: 400 },
          );
        }

        console.info("[Aurelius] OTP verification success", { email });
        return Response.json({
          ok: true,
          message: "Email verified successfully",
          verificationToken: result.verificationToken,
          expiresAt: result.expiresAt,
        });
      },
    },
  },
});
