import { createFileRoute } from "@tanstack/react-router";
import { verifyEmailOtp } from "@/lib/auth/otp.store.server";

export const Route = createFileRoute("/api/waitlist/verify-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { email?: string; otp?: string };
        const email = body.email?.trim().toLowerCase() ?? "";
        const otp = body.otp?.trim() ?? "";

        console.info("[Aurelius] OTP verify request", { email, otpLength: otp.length });

        if (!email.includes("@")) {
          return Response.json({ error: "Enter a valid email address.", code: "INVALID_EMAIL" }, { status: 400 });
        }

        const result = await verifyEmailOtp(email, otp);
        if (!result.ok) {
          console.warn("[Aurelius] OTP verify rejected", { email, code: result.code, error: result.error });
          return Response.json({ error: result.error, code: result.code ?? "INVALID_OTP" }, { status: 400 });
        }

        console.info("[Aurelius] OTP verify success — token issued", { email });
        return Response.json({
          ok: true,
          verificationToken: result.verificationToken,
          expiresAt: result.expiresAt,
        });
      },
    },
  },
});
