import { issueEmailOtp, OTP_EXPIRY_MINUTES, revokeEmailOtp } from "@/lib/auth/otp.store.server";
import { readStore } from "@/lib/auth/store.server";
import { sendOtpVerificationEmail } from "./application.server";
import { getResendFromAddress, isResendConfigured, isResendProductionFromConfigured } from "./resend.server";
import { isOtpEmailConfigured } from "./otp-email.server";

const EMAIL_SEND_ERROR = "Unable to send verification email. Please try again.";

export type OtpSendInput = {
  email: string;
  fullName?: string;
  source?: "api" | "waitlist";
};

export type OtpSendSuccess = {
  ok: true;
  sent: boolean;
  expiresAt: string;
  resendId?: string;
  emailConfigured: boolean;
};

export type OtpSendFailure = {
  ok: false;
  error: string;
  code: string;
  retryAfterSeconds?: number;
  status: number;
};

export type OtpSendResult = OtpSendSuccess | OtpSendFailure;

export async function executeOtpSendFlow(input: OtpSendInput): Promise<OtpSendResult> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName?.trim() || "Applicant";
  const source = input.source ?? "api";

  console.info("[Aurelius] OTP flow started", {
    email,
    source,
    resendConfigured: isResendConfigured(),
    resendFrom: getResendFromAddress(),
    resendProductionReady: isResendProductionFromConfigured(),
    emailConfigured: isOtpEmailConfigured(),
  });

  if (!email.includes("@")) {
    return {
      ok: false,
      error: "Enter a valid email address.",
      code: "INVALID_EMAIL",
      status: 400,
    };
  }

  if (source === "waitlist") {
    const store = await readStore();
    if (store.waitlist.some((w) => w.email === email)) {
      console.warn("[Aurelius] OTP flow blocked — application exists", { email });
      return {
        ok: false,
        error: "An application with this email already exists.",
        code: "APPLICATION_EXISTS",
        status: 409,
      };
    }
    if (store.members.some((m) => m.email === email && !m.revoked)) {
      console.warn("[Aurelius] OTP flow blocked — member exists", { email });
      return {
        ok: false,
        error: "This email is already registered as a member. Sign in instead.",
        code: "EMAIL_ALREADY_REGISTERED",
        status: 409,
      };
    }
  }

  let issued: Awaited<ReturnType<typeof issueEmailOtp>>;
  try {
    issued = await issueEmailOtp(email);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OTP generation failed";
    console.error("[Aurelius] OTP generation exception", { email, message });
    return { ok: false, error: message, code: "OTP_GENERATION_FAILED", status: 500 };
  }

  if (!issued.ok) {
    console.warn("[Aurelius] OTP generation rejected", { email, error: issued.error });
    return {
      ok: false,
      error: issued.error,
      code: "RATE_LIMITED",
      retryAfterSeconds: issued.retryAfterSeconds,
      status: issued.retryAfterSeconds ? 429 : 400,
    };
  }

  console.info("[Aurelius] OTP generated — sending email", {
    email,
    expiresAt: issued.expiresAt,
    otpLength: issued.otp.length,
  });

  let emailResult: Awaited<ReturnType<typeof sendOtpVerificationEmail>>;
  try {
    emailResult = await sendOtpVerificationEmail({
      to: email,
      fullName,
      otp: issued.otp,
      expiresMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    console.error("[Aurelius] OTP email send exception", { email, message });
    await revokeEmailOtp(email);
    return {
      ok: false,
      error: EMAIL_SEND_ERROR,
      code: "EMAIL_SEND_FAILED",
      status: 503,
    };
  }

  if (emailResult.sent) {
    console.info("[Aurelius] OTP email sent successfully", {
      email,
      resendId: emailResult.resendId,
    });
  } else {
    console.error("[Aurelius] OTP email send failure", {
      email,
      reason: emailResult.reason,
    });
    await revokeEmailOtp(email);
    const configured = isOtpEmailConfigured();
    if (emailResult.reason?.includes("domain is not verified")) {
      console.error(
        "[Aurelius] Resend domain not verified — add DNS records at https://resend.com/domains for",
        getResendFromAddress(),
      );
    }
    return {
      ok: false,
      error: EMAIL_SEND_ERROR,
      code: configured ? "EMAIL_SEND_FAILED" : "EMAIL_NOT_CONFIGURED",
      status: 503,
    };
  }

  return {
    ok: true,
    sent: emailResult.sent,
    expiresAt: issued.expiresAt,
    resendId: emailResult.resendId,
    emailConfigured: isOtpEmailConfigured(),
  };
}
