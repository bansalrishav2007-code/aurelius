import { sendAureliusEmail, type SendEmailResult } from "./send.server";
import { isOtpEmailConfigured, sendOtpEmail } from "./otp-email.server";
import {
  buildApplicationReceivedHtml,
  buildApplicationUnderReviewHtml,
  buildMembershipApprovedHtml,
  buildMembershipRejectedHtml,
  buildWaitlistAdminNotificationHtml,
} from "./templates.server";

const ADMIN_NOTIFICATION_EMAIL = "aurelius.teamx@gmail.com";

export async function sendOtpVerificationEmail(input: {
  to: string;
  fullName: string;
  otp: string;
  expiresMinutes: number;
}): Promise<SendEmailResult & { resendId?: string }> {
  const result = await sendOtpEmail({
    email: input.to,
    otp: input.otp,
    fullName: input.fullName,
    expiresMinutes: input.expiresMinutes,
  });

  if (!result.sent && !isOtpEmailConfigured()) {
    return {
      ...result,
      reason: result.reason ?? "Resend is not configured for production delivery.",
    };
  }

  return result;
}

export async function sendApplicationReceivedEmail(input: {
  to: string;
  fullName: string;
  referenceNumber?: string;
}): Promise<SendEmailResult> {
  return sendAureliusEmail({
    to: input.to,
    subject: "Your Aurelius application has been received",
    html: buildApplicationReceivedHtml({ fullName: input.fullName, referenceNumber: input.referenceNumber }),
    logLabel: "Application received",
  });
}

export async function sendWaitlistAdminNotificationEmail(input: {
  fullName: string;
  email: string;
  phone: string;
  profession: string;
  wealthNature?: string;
  wealthConcern?: string;
  city?: string;
  referenceNumber: string;
}): Promise<SendEmailResult> {
  return sendAureliusEmail({
    to: ADMIN_NOTIFICATION_EMAIL,
    subject: `New Aurelius application — ${input.referenceNumber}`,
    html: buildWaitlistAdminNotificationHtml(input),
    logLabel: "Waitlist admin notification",
  });
}

export async function sendMembershipApprovedEmail(input: {
  to: string;
  fullName: string;
}): Promise<SendEmailResult> {
  return sendAureliusEmail({
    to: input.to,
    subject: "Your Aurelius membership has been approved",
    html: buildMembershipApprovedHtml({ fullName: input.fullName }),
    logLabel: "Membership approved",
  });
}

export async function sendMembershipRejectedEmail(input: {
  to: string;
  fullName: string;
}): Promise<SendEmailResult> {
  return sendAureliusEmail({
    to: input.to,
    subject: "Update on your Aurelius application",
    html: buildMembershipRejectedHtml({ fullName: input.fullName }),
    logLabel: "Membership rejected",
  });
}

export async function sendApplicationUnderReviewEmail(input: {
  to: string;
  fullName: string;
}): Promise<SendEmailResult> {
  return sendAureliusEmail({
    to: input.to,
    subject: "Your Aurelius application is under review",
    html: buildApplicationUnderReviewHtml({ fullName: input.fullName }),
    logLabel: "Application under review",
  });
}
