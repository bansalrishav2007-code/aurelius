function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function aureliusEmailShell(opts: { eyebrow: string; title: string; body: string; cta?: { label: string; href: string } }) {
  const ctaBlock = opts.cta
    ? `<tr><td style="padding:0 36px 36px;">
        <a href="${opts.cta.href}" style="display:inline-block;background:#f5f3ef;color:#0a0a0a;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:500;">${escapeHtml(opts.cta.label)}</a>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#0a0a0a;font-family:Georgia,'Times New Roman',serif;color:#e8e6e3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#111;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
    <tr><td style="padding:40px 36px 20px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#888;">${escapeHtml(opts.eyebrow)}</p>
      <h1 style="margin:0;font-size:28px;font-weight:400;color:#f5f3ef;">${escapeHtml(opts.title)}</h1>
    </td></tr>
    <tr><td style="padding:0 36px 28px;font-size:15px;line-height:1.65;color:#b8b5b0;">
      ${opts.body}
    </td></tr>
    ${ctaBlock}
    <tr><td style="padding:20px 36px;border-top:1px solid #222;font-size:11px;color:#555;">
      Aurelius · Private Wealth Intelligence · Confidential
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildOtpVerificationHtml(input: {
  fullName: string;
  otp: string;
  expiresMinutes: number;
  expiresAt?: Date;
}) {
  const name = escapeHtml(input.fullName);
  const expiresAt = input.expiresAt ?? new Date(Date.now() + input.expiresMinutes * 60 * 1000);
  const expiryIst = expiresAt.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
  const greeting = name ? `Hello ${name},<br><br>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurelius Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0E1A; font-family: 'DM Sans', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0E1A; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 60px 20px;">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color: #0F1628; border: 1px solid #1E2A45; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 48px 32px; border-bottom: 1px solid #1E2A45;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #C9A84C, #E8C96D); border-radius: 8px; display: inline-block; text-align: center; line-height: 36px; font-size: 20px; font-weight: bold; color: #0A0E1A; margin-right: 12px; vertical-align: middle;">A</div>
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="color: #C9A84C; font-size: 18px; font-weight: 600; letter-spacing: 1px;">AURELIUS</span>
                    <div style="color: #6B7280; font-size: 10px; letter-spacing: 2px; margin-top: 2px;">PRIVATE WEALTH INTELLIGENCE</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 48px;">
              <p style="color: #B0B0B0; font-size: 14px; margin: 0 0 8px 0; letter-spacing: 1px; text-transform: uppercase;">Verification Code</p>
              <h1 style="color: #FFFFFF; font-size: 28px; font-weight: 700; margin: 0 0 24px 0; font-family: Georgia, serif;">Verify your identity.</h1>
              <p style="color: #B0B0B0; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
                ${greeting}Use this verification code to continue your Aurelius membership application. This code expires in <strong style="color: #C9A84C;">${input.expiresMinutes} minutes</strong>.
              </p>
              <div style="background: #151B2E; border: 1px solid #C9A84C; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 32px 0;">
                <p style="color: #6B7280; font-size: 12px; letter-spacing: 2px; margin: 0 0 12px 0; text-transform: uppercase;">Your verification code</p>
                <p style="color: #C9A84C; font-size: 48px; font-weight: 700; letter-spacing: 16px; margin: 0; font-family: 'Courier New', monospace;">${escapeHtml(input.otp)}</p>
                <p style="color: #6B7280; font-size: 12px; margin: 12px 0 0 0;">Expires in ${input.expiresMinutes} minutes — do not share this code</p>
              </div>
              <p style="color: #6B7280; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
                If you did not request this code, please ignore this email. Your security is our priority.
              </p>
              <p style="color: #6B7280; font-size: 13px; margin: 0;">
                This code expires at ${escapeHtml(expiryIst)} IST.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 48px; border-top: 1px solid #1E2A45;">
              <p style="color: #4B5563; font-size: 12px; margin: 0; text-align: center;">
                Aurelius Private · Private Wealth Intelligence · India<br>
                <span style="color: #C9A84C;">aurelius.teamx@gmail.com</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWaitlistAdminNotificationHtml(input: {
  fullName: string;
  email: string;
  phone: string;
  profession: string;
  wealthNature?: string;
  wealthConcern?: string;
  city?: string;
  referenceNumber: string;
}) {
  const rows = [
    ["Reference", input.referenceNumber],
    ["Name", input.fullName],
    ["Email", input.email],
    ["Phone", input.phone],
    ["Profession", input.profession],
    ["Nature of wealth", input.wealthNature ?? "—"],
    ["Primary concern", input.wealthConcern ?? "—"],
    ["City", input.city ?? "—"],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(label)}</td><td style="padding:8px 0;color:#e8e6e3;font-size:14px;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return aureliusEmailShell({
    eyebrow: "New application",
    title: "Membership application received",
    body: `
      <p>A new confidential membership application has been submitted.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #222;">
        ${rows}
      </table>
    `,
  });
}

export function buildApplicationReceivedHtml(input: { fullName: string; referenceNumber?: string }) {
  const name = escapeHtml(input.fullName);
  const refBlock = input.referenceNumber
    ? `<p style="margin:24px 0;padding:16px 20px;background:#1a1a1a;border:1px solid #c9a96233;border-radius:12px;">
        <span style="display:block;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#888;margin-bottom:6px;">Application reference</span>
        <span style="font-size:16px;letter-spacing:0.12em;color:#d4af37;font-family:monospace;">${escapeHtml(input.referenceNumber)}</span>
      </p>`
    : "";
  return aureliusEmailShell({
    eyebrow: "Application received",
    title: "Your request is under review",
    body: `
      <p>Dear ${name},</p>
      <p>Thank you for applying to Aurelius Private. Your membership application has been received and your email address has been verified.</p>
      ${refBlock}
      <p>Our private office reviews a limited cohort each quarter. If your profile aligns with Aurelius, you will receive a personal invitation — never a mass email — with a one-time access code tied to your registered address.</p>
      <p style="margin-top:20px;font-size:13px;color:#888;">Typical review window: 5–10 business days. No follow-up is required.</p>
    `,
  });
}

export function buildMembershipApprovedHtml(input: { fullName: string }) {
  const name = escapeHtml(input.fullName);
  return aureliusEmailShell({
    eyebrow: "Membership approved",
    title: "Welcome to Aurelius Private",
    body: `
      <p>Dear ${name},</p>
      <p>We are pleased to inform you that your confidential application has been <strong style="color:#d4af37;">approved</strong> by the Aurelius private office.</p>
      <p>A separate message containing your personal invitation code will arrive shortly. That code is issued exclusively to you and may be used once to activate your private workspace.</p>
    `,
  });
}

export function buildMembershipRejectedHtml(input: { fullName: string }) {
  const name = escapeHtml(input.fullName);
  return aureliusEmailShell({
    eyebrow: "Application update",
    title: "Thank you for your interest",
    body: `
      <p>Dear ${name},</p>
      <p>Thank you for applying to Aurelius Private. After careful review, we are unable to extend an invitation at this time.</p>
      <p>Membership remains highly selective and capacity is limited. This decision reflects fit and timing — not the quality of your profile.</p>
      <p style="margin-top:20px;font-size:13px;color:#888;">You may reapply in future quarters if your circumstances change. We appreciate your discretion and interest in Aurelius.</p>
    `,
  });
}

export function buildApplicationUnderReviewHtml(input: { fullName: string }) {
  const name = escapeHtml(input.fullName);
  return aureliusEmailShell({
    eyebrow: "Application received",
    title: "Your application is under review",
    body: `
      <p>Dear ${name},</p>
      <p>Thank you for applying to Aurelius Private. Your application has been received and is now under review by our private office.</p>
      <p style="margin:24px 0;padding:16px 20px;background:#1a1a1a;border:1px solid #c9a96233;border-radius:12px;font-size:14px;color:#d4af37;">
        We will be in touch within 48 hours.
      </p>
      <p style="font-size:13px;color:#888;">No follow-up is required. If approved, you will receive a personal invitation with a one-time access code.</p>
    `,
  });
}

export function buildInviteCodeIssuedHtml(input: {
  fullName: string;
  inviteCode: string;
  accessUrl: string;
  expiresAt: string | null;
  tier: string;
}) {
  const name = escapeHtml(input.fullName);
  const expiry = input.expiresAt
    ? new Date(input.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "No expiry — personal allocation";

  return aureliusEmailShell({
    eyebrow: "Invite code issued",
    title: "Your private access code",
    body: `
      <p>Dear ${name},</p>
      <p>Your ${escapeHtml(input.tier)} invitation is ready. Use the code below with your registered email to create your Aurelius account.</p>
      <p style="margin:24px 0;padding:20px;background:#1a1a1a;border:1px solid #c9a96233;border-radius:12px;text-align:center;">
        <span style="display:block;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#888;margin-bottom:8px;">Personal invitation code</span>
        <span style="font-size:22px;letter-spacing:0.14em;color:#d4af37;font-family:monospace;">${escapeHtml(input.inviteCode)}</span>
      </p>
      <p>Valid until ${escapeHtml(expiry)}. This code is single-use and bound to your registered email.</p>
    `,
    cta: { label: "Activate membership", href: input.accessUrl },
  });
}
