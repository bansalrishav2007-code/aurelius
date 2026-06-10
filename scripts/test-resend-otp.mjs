/**
 * Quick Resend production check for OTP delivery.
 * Usage: node scripts/test-resend-otp.mjs you@example.com
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.error("Could not read .env");
    process.exit(1);
  }
}

loadEnv();

const to = process.argv[2];
if (!to?.includes("@")) {
  console.error("Usage: node scripts/test-resend-otp.mjs recipient@email.com");
  process.exit(1);
}

const key = process.env.RESEND_API_KEY?.trim();
const from =
  process.env.RESEND_FROM_EMAIL?.trim() ||
  process.env.OTP_FROM_EMAIL?.trim() ||
  "Aurelius <verify@aurelius.ai>";

if (!key) {
  console.error("RESEND_API_KEY is missing in .env");
  process.exit(1);
}

console.log("Testing Resend OTP delivery…");
console.log("  from:", from);
console.log("  to:  ", to);

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject: "Your Aurelius Verification Code",
    html: "<p>Resend production test — OTP delivery is working.</p>",
  }),
});

const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error("\nFAILED:", body.message ?? res.statusText);
  if (String(body.message).includes("domain is not verified")) {
    console.error("\nNext steps:");
    console.error("  1. Open https://resend.com/domains");
    console.error("  2. Add your domain (e.g. aurelius.ai)");
    console.error("  3. Add the DNS records Resend provides");
    console.error("  4. Wait until status is Verified");
    console.error("  5. Set RESEND_FROM_EMAIL=Aurelius <verify@yourdomain.com> in .env");
    console.error("  6. Restart npm run dev and run this script again");
  }
  process.exit(1);
}

console.log("\nSUCCESS — email id:", body.id);
console.log("Check the inbox for:", to);
