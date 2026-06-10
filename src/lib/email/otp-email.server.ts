import { buildOtpVerificationHtml } from "./templates.server";
import {
  AURELIUS_OTP_SUBJECT,
  getResendFromAddress,
  isResendConfigured,
  isResendProductionFromConfigured,
  isResendTestFrom,
  sendViaResendSdk,
} from "./resend.server";
import { isEmailConfigured, type SendEmailResult } from "./send.server";

export type SendOtpEmailInput = {
  email: string;
  otp: string;
  fullName?: string;
  expiresMinutes: number;
};

export type SendOtpEmailResult = SendEmailResult & { resendId?: string };

export async function sendOtpEmail(input: SendOtpEmailInput): Promise<SendOtpEmailResult> {
  const to = input.email.trim().toLowerCase();
  const fullName = input.fullName?.trim() || "Applicant";
  const html = buildOtpVerificationHtml({
    fullName,
    otp: input.otp,
    expiresMinutes: input.expiresMinutes,
  });
  const from = getResendFromAddress();

  console.info("[Aurelius] sendOtpEmail called", {
    to,
    from,
    resendConfigured: isResendConfigured(),
    productionFrom: isResendProductionFromConfigured(),
  });

  if (!isResendConfigured()) {
    console.error("[Aurelius] OTP email blocked — RESEND_API_KEY not configured");
    return {
      ok: true,
      sent: false,
      reason: "RESEND_API_KEY not configured. Add it to .env and restart the server.",
    };
  }

  if (isResendTestFrom(from)) {
    console.error(
      "[Aurelius] OTP email blocked — Resend test from address cannot reach arbitrary recipients. " +
        "Verify a domain at https://resend.com/domains and set RESEND_FROM_EMAIL=Aurelius <verify@yourdomain.com>",
    );
    return {
      ok: true,
      sent: false,
      reason:
        "Resend is in test mode (onboarding@resend.dev). Verify your domain at resend.com/domains and set RESEND_FROM_EMAIL to a verified address.",
    };
  }

  const resendResult = await sendViaResendSdk({
    to,
    subject: AURELIUS_OTP_SUBJECT,
    html,
    from,
    logLabel: "OTP Resend",
  });

  if (resendResult.sent) {
    console.info("[Aurelius] OTP email sent successfully via Resend", { to, from, resendId: resendResult.resendId });
    return resendResult;
  }

  const reason = resendResult.reason ?? "Resend delivery failed";
  console.error("[Aurelius] OTP email send failure (Resend)", { to, from, reason });

  if (reason.includes("domain is not verified")) {
    return {
      ok: true,
      sent: false,
      reason:
        `Resend domain not verified for ${from}. Add and verify the domain at https://resend.com/domains, then restart the server.`,
    };
  }

  return resendResult;
}

export function isOtpEmailConfigured(): boolean {
  return isResendConfigured() && isResendProductionFromConfigured();
}
