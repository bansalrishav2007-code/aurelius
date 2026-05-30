type InvitationEmailInput = {
  to: string;
  fullName: string;
  inviteCode: string;
  accessUrl: string;
  expiresAt: string | null;
  tier: string;
};

export type SendInvitationResult =
  | { ok: true; sent: true }
  | { ok: true; sent: false; devPreview: InvitationEmailInput; reason: string };

function appBaseUrl(): string {
  return (
    process.env.AURELIUSS_APP_URL ??
    process.env.APP_URL ??
    (process.env.NODE_ENV === "production" ? "https://aureliuss.com" : "http://localhost:8080")
  );
}

export function buildAccessUrl(code: string, email: string): string {
  const base = appBaseUrl().replace(/\/$/, "");
  const params = new URLSearchParams({ code, email });
  return `${base}/access?${params.toString()}`;
}

function buildEmailHtml(input: InvitationEmailInput): string {
  const expiry = input.expiresAt
    ? new Date(input.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "No expiry — personal allocation";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#0a0a0a;font-family:Georgia,'Times New Roman',serif;color:#e8e6e3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#111;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
    <tr><td style="padding:40px 36px 24px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#888;">Private invitation</p>
      <h1 style="margin:0;font-size:28px;font-weight:400;color:#f5f3ef;">Welcome to Aureliuss Private</h1>
    </td></tr>
    <tr><td style="padding:0 36px 24px;font-size:15px;line-height:1.65;color:#b8b5b0;">
      <p>Dear ${input.fullName},</p>
      <p>Your confidential application has been approved. You are invited to join Aureliuss — India's private wealth intelligence network.</p>
      <p style="margin:24px 0;padding:20px;background:#1a1a1a;border:1px solid #c9a96233;border-radius:12px;text-align:center;">
        <span style="display:block;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#888;margin-bottom:8px;">Your personal invitation code</span>
        <span style="font-size:22px;letter-spacing:0.14em;color:#d4af37;font-family:monospace;">${input.inviteCode}</span>
      </p>
      <p><strong style="color:#e8e6e3;">Important:</strong> This code is issued exclusively to <span style="color:#d4af37;">${input.to}</span> and may be used once. Valid until ${expiry}.</p>
    </td></tr>
    <tr><td style="padding:0 36px 36px;">
      <a href="${input.accessUrl}" style="display:inline-block;background:#f5f3ef;color:#0a0a0a;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:500;">Enter private access</a>
      <p style="margin:20px 0 0;font-size:12px;color:#666;">Or visit ${input.accessUrl.replace(/&/g, "&amp;")}</p>
    </td></tr>
    <tr><td style="padding:20px 36px;border-top:1px solid #222;font-size:11px;color:#555;">
      Aureliuss Private · Confidential · Do not forward this invitation
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendInvitationEmail(input: InvitationEmailInput): Promise<SendInvitationResult> {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.AURELIUSS_EMAIL_FROM ?? "Aureliuss Private <invitations@aureliuss.com>";

  if (!resendKey) {
    console.info("[Aureliuss] Invitation email (dev — no RESEND_API_KEY):", {
      to: input.to,
      code: input.inviteCode,
      url: input.accessUrl,
    });
    return {
      ok: true,
      sent: false,
      devPreview: input,
      reason: "RESEND_API_KEY not configured — logged to server console.",
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Your private invitation to Aureliuss",
      html: buildEmailHtml(input),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[Aureliuss] Email send failed:", text);
    return {
      ok: true,
      sent: false,
      devPreview: input,
      reason: `Email delivery failed: ${text || res.statusText}`,
    };
  }

  return { ok: true, sent: true };
}

export { appBaseUrl };
