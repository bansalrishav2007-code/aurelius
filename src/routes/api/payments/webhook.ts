import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookSignature } from "@/lib/payments/razorpay.server";

export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";

        if (process.env.RAZORPAY_WEBHOOK_SECRET && !verifyWebhookSignature(raw, signature)) {
          return Response.json({ error: "Invalid signature." }, { status: 401 });
        }

        const event = JSON.parse(raw) as {
          event?: string;
          payload?: { payment?: { entity?: { notes?: { email?: string; planId?: string } } } };
        };

        if (event.event === "payment.captured") {
          const email = event.payload?.payment?.entity?.notes?.email;
          const planId = event.payload?.payment?.entity?.notes?.planId;
          if (email) {
            const { readStore, writeStore } = await import("@/lib/auth/store.server");
            const store = await readStore();
            const member = store.members.find((m) => m.email === email.toLowerCase());
            if (member) {
              member.subscription = "active";
              member.subscriptionPlan = planId;
              await writeStore(store);
            }
          }
        }

        return Response.json({ ok: true });
      },
    },
  },
});
