import { sendAureliusEmail, type SendEmailResult } from "./send.server";
import { buildInviteCodeIssuedHtml } from "./templates.server";

type InvitationEmailInput = {
  to: string;
  fullName: string;
  inviteCode: string;
  accessUrl: string;
  expiresAt: string | null;
  tier: string;
};

export type SendInvitationResult = SendEmailResult & {
  devPreview?: InvitationEmailInput;
};

function appBaseUrl(): string {
  return (
    process.env.AURELIUS_APP_URL ??
    process.env.AURELIUSS_APP_URL ??
    process.env.APP_URL ??
    (process.env.NODE_ENV === "production" ? "https://aurelius.com" : "http://localhost:8080")
  );
}

export function buildAccessUrl(code: string, email: string): string {
  const base = appBaseUrl().replace(/\/$/, "");
  const params = new URLSearchParams({ code, email });
  return `${base}/access?${params.toString()}`;
}

export async function sendInvitationEmail(input: InvitationEmailInput): Promise<SendInvitationResult> {
  const result = await sendAureliusEmail({
    to: input.to,
    subject: "Your Aurelius private access code",
    html: buildInviteCodeIssuedHtml({
      fullName: input.fullName,
      inviteCode: input.inviteCode,
      accessUrl: input.accessUrl,
      expiresAt: input.expiresAt,
      tier: input.tier,
    }),
    logLabel: "Invite code issued",
  });

  if (!result.sent) {
    return { ...result, devPreview: input };
  }
  return result;
}

export { appBaseUrl };
