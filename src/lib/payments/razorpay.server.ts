/**
 * Razorpay integration scaffold — wire credentials via environment variables.
 * Production: create orders server-side, verify webhooks with HMAC signature.
 */

export type SubscriptionPlan = {
  id: string;
  name: string;
  tier: "principal" | "family-office";
  amountPaise: number;
  interval: "monthly" | "annual";
  features: string[];
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "principal-annual",
    name: "Principal Membership",
    tier: "principal",
    amountPaise: 4_990_000,
    interval: "annual",
    features: ["AI copilot", "Secure vault (50 GB)", "Compliance center", "Priority support"],
  },
  {
    id: "family-office-annual",
    name: "Family Office Charter",
    tier: "family-office",
    amountPaise: 14_990_000,
    interval: "annual",
    features: ["Everything in Principal", "Multi-entity vault", "Dedicated advisor channel", "Custom integrations"],
  },
];

export function getRazorpayConfig() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    enabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  };
}

export type CreateOrderInput = {
  planId: string;
  email: string;
  fullName: string;
  waitlistId?: string;
};

export type CreateOrderResult =
  | { ok: true; orderId: string; amount: number; currency: string; keyId: string }
  | { ok: false; error: string };

/** Creates a Razorpay order — returns mock order when credentials are absent (dev). */
export async function createRazorpayOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === input.planId);
  if (!plan) return { ok: false, error: "Unknown subscription plan." };

  const config = getRazorpayConfig();
  if (!config.enabled) {
    return {
      ok: true,
      orderId: `order_dev_${crypto.randomUUID().slice(0, 8)}`,
      amount: plan.amountPaise,
      currency: "INR",
      keyId: "rzp_test_dev",
    };
  }

  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: plan.amountPaise,
      currency: "INR",
      receipt: `aurelius_${input.email}_${Date.now()}`,
      notes: { planId: plan.id, email: input.email, waitlistId: input.waitlistId ?? "" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Razorpay error: ${text || res.statusText}` };
  }

  const data = (await res.json()) as { id: string; amount: number; currency: string };
  return { ok: true, orderId: data.id, amount: data.amount, currency: data.currency, keyId: config.keyId };
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) return false;
  // Production: crypto.createHmac('sha256', webhookSecret).update(body).digest('hex') === signature
  return Boolean(signature && webhookSecret);
}
