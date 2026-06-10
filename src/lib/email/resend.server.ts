import { Resend } from "resend";

/** Resend test sender — only delivers to the Resend account owner email. */
export const RESEND_TEST_FROM_EMAIL = "onboarding@resend.dev";
export const AURELIUS_OTP_FROM_TEST = `Aurelius <${RESEND_TEST_FROM_EMAIL}>`;

/** Default production sender once a domain is verified in Resend. */
export const AURELIUS_OTP_FROM_PRODUCTION = "Aurelius <verify@aurelius.ai>";

export const AURELIUS_OTP_SUBJECT = "Your Aurelius Verification Code";

function formatResendFrom(raw: string): string {
  if (raw.includes("<") && raw.includes(">")) return raw;
  if (raw.includes("@")) return `Aurelius <${raw}>`;
  return raw;
}

/** Extract bare email from a Resend `from` value. */
export function extractFromEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] ?? from).trim().toLowerCase();
}

export function isResendTestFrom(from: string): boolean {
  return extractFromEmail(from) === RESEND_TEST_FROM_EMAIL;
}

/** Resolve the Resend `from` address for production OTP / transactional mail. */
export function getResendFromAddress(): string {
  const raw =
    process.env.OTP_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.AURELIUS_EMAIL_FROM?.trim() ||
    process.env.AURELIUSS_EMAIL_FROM?.trim();

  if (!raw) return AURELIUS_OTP_FROM_PRODUCTION;
  return formatResendFrom(raw);
}

export function isResendProductionFromConfigured(): boolean {
  return !isResendTestFrom(getResendFromAddress());
}

export const AURELIUS_OTP_FROM = getResendFromAddress();

export type ResendSendResult =
  | { ok: true; sent: true; resendId?: string }
  | { ok: true; sent: false; reason: string; devPreview?: { to: string; subject: string } }
  | { ok: false; sent: false; reason: string; devPreview?: { to: string; subject: string } };

let resendClient: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY not configured");
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

export async function sendViaResendSdk(input: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  logLabel?: string;
}): Promise<ResendSendResult> {
  if (!isResendConfigured()) {
    return { ok: true, sent: false, reason: "RESEND_API_KEY not configured." };
  }

  const from = input.from ?? getResendFromAddress();
  const label = input.logLabel ?? "email";

  if (isResendTestFrom(from)) {
    console.warn(
      `[Aurelius] Resend test from address (${from}) — can only deliver to your Resend account email. ` +
        "Verify a domain at https://resend.com/domains and set RESEND_FROM_EMAIL to e.g. Aurelius <verify@aurelius.ai>",
    );
  }

  console.info(`[Aurelius] Resend send invoked (${label})`, {
    to: input.to,
    from,
    subject: input.subject,
    apiKeyPresent: Boolean(process.env.RESEND_API_KEY?.trim()),
    productionFrom: isResendProductionFromConfigured(),
  });

  try {
    const { data, error } = await getResendClient().emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (error) {
      console.error(`[Aurelius] Resend send failed (${label}):`, {
        to: input.to,
        from,
        statusCode: (error as { statusCode?: number }).statusCode,
        name: (error as { name?: string }).name,
        message: error.message,
      });
      return {
        ok: false,
        sent: false,
        reason: error.message ?? "Resend delivery failed",
        devPreview: { to: input.to, subject: input.subject },
      };
    }

    if (!data?.id) {
      console.error(`[Aurelius] Resend returned no message id (${label})`, { to: input.to, from, data });
      return {
        ok: false,
        sent: false,
        reason: "Resend accepted the request but returned no message id.",
        devPreview: { to: input.to, subject: input.subject },
      };
    }

    console.info(`[Aurelius] Resend email sent (${label})`, {
      to: input.to,
      from,
      resendId: data.id,
    });

    return { ok: true, sent: true, resendId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resend delivery failed";
    console.error(`[Aurelius] Resend exception (${label}):`, { to: input.to, from, message });
    return {
      ok: false,
      sent: false,
      reason: message,
      devPreview: { to: input.to, subject: input.subject },
    };
  }
}
