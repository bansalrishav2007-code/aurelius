import nodemailer from "nodemailer";
import { getResendFromAddress, isResendConfigured, sendViaResendSdk } from "./resend.server";

export type SendEmailResult =
  | { ok: true; sent: true }
  | { ok: true; sent: false; reason: string; devPreview?: { to: string; subject: string } }
  | { ok: false; sent: false; reason: string; devPreview?: { to: string; subject: string } };

const DEFAULT_GMAIL_USER = "aurelius.teamx@gmail.com";

export function getGmailCredentials(): { user: string; pass: string } | null {
  const user = (process.env.EMAIL_USER ?? DEFAULT_GMAIL_USER).trim();
  const pass = process.env.EMAIL_PASSWORD?.trim();
  if (!user || !pass) return null;
  return { user, pass };
}

export function isGmailConfigured(): boolean {
  return getGmailCredentials() !== null;
}

export function isEmailConfigured(): boolean {
  return isResendConfigured();
}

export function emailFromAddress(): string {
  const gmail = getGmailCredentials();
  if (gmail) return `Aurelius Private <${gmail.user}>`;
  return (
    process.env.AURELIUS_EMAIL_FROM ??
    process.env.AURELIUSS_EMAIL_FROM ??
    `Aurelius Private <${DEFAULT_GMAIL_USER}>`
  );
}

export async function sendViaGmail(input: {
  to: string;
  subject: string;
  html: string;
  logLabel?: string;
  from?: string;
}): Promise<SendEmailResult> {
  const creds = getGmailCredentials();
  if (!creds) {
    return { ok: true, sent: false, reason: "Gmail credentials not configured (EMAIL_USER / EMAIL_PASSWORD)." };
  }

  const from = input.from ?? `Aurelius <${creds.user}>`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: creds.user, pass: creds.pass },
  });

  console.info(`[Aurelius] Gmail send invoked (${input.logLabel ?? "email"})`, {
    to: input.to,
    from,
    subject: input.subject,
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    console.info(`[Aurelius] Gmail email sent (${input.logLabel ?? "email"})`, {
      to: input.to,
      from,
      messageId: info.messageId,
    });
    return { ok: true, sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail delivery failed";
    console.error(`[Aurelius] Gmail send failed (${input.logLabel ?? "email"}):`, message);
    return {
      ok: true,
      sent: false,
      reason: message,
      devPreview: { to: input.to, subject: input.subject },
    };
  }
}

export async function sendAureliusEmail(input: {
  to: string;
  subject: string;
  html: string;
  logLabel?: string;
}): Promise<SendEmailResult> {
  if (isResendConfigured()) {
    const resendResult = await sendViaResendSdk({
      to: input.to,
      subject: input.subject,
      html: input.html,
      from: getResendFromAddress(),
      logLabel: input.logLabel,
    });
    if (resendResult.sent) return resendResult;
    console.warn(`[Aurelius] Resend failed, trying Gmail fallback…`, { reason: resendResult.reason });
  }

  if (isGmailConfigured()) {
    const gmailResult = await sendViaGmail(input);
    if (gmailResult.sent) return gmailResult;
    console.warn(`[Aurelius] Gmail failed`, { reason: gmailResult.reason });
  }

  console.info(`[Aurelius] ${input.logLabel ?? "Email"} (dev — no mail transport):`, {
    to: input.to,
    subject: input.subject,
  });
  return {
    ok: true,
    sent: false,
    reason: isEmailConfigured()
      ? "Email delivery failed for all configured transports."
      : "Set RESEND_API_KEY or EMAIL_USER and EMAIL_PASSWORD to send emails.",
    devPreview: { to: input.to, subject: input.subject },
  };
}
