export type OtpErrorCode =
  | "EMAIL_NOT_CONFIGURED"
  | "OTP_NOT_SENT"
  | "EMAIL_SEND_FAILED"
  | "INVALID_OTP"
  | "EXPIRED_OTP"
  | "OTP_NOT_FOUND"
  | "TOO_MANY_ATTEMPTS"
  | "RATE_LIMITED"
  | "INVALID_EMAIL"
  | "EMAIL_ALREADY_REGISTERED"
  | "APPLICATION_EXISTS";

export function otpErrorMessage(code: OtpErrorCode, detail?: string): string {
  switch (code) {
    case "EMAIL_NOT_CONFIGURED":
      return "Email service is not configured. Set EMAIL_USER and EMAIL_PASSWORD in your .env file.";
    case "OTP_NOT_SENT":
      return detail ?? "Verification code could not be sent. Please try again.";
    case "EMAIL_SEND_FAILED":
      return detail ?? "Email delivery failed. Check server logs or try again later.";
    case "INVALID_OTP":
      return detail ?? "Invalid verification code. Please check and try again.";
    case "EXPIRED_OTP":
      return "Verification code expired. Request a new code.";
    case "OTP_NOT_FOUND":
      return "No verification code found for this email. Request a new code.";
    case "TOO_MANY_ATTEMPTS":
      return detail ?? "Too many failed attempts. Request a new code.";
    case "RATE_LIMITED":
      return detail ?? "Please wait before requesting another code.";
    case "INVALID_EMAIL":
      return "Enter a valid email address.";
    case "EMAIL_ALREADY_REGISTERED":
      return "This email is already registered as a member. Sign in instead.";
    case "APPLICATION_EXISTS":
      return "An application with this email already exists.";
    default:
      return detail ?? "Verification failed.";
  }
}
