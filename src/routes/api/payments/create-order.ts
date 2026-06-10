import { createFileRoute } from "@tanstack/react-router";
import { createRazorpayOrder } from "@/lib/payments/razorpay.server";

export const Route = createFileRoute("/api/payments/create-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          planId?: string;
          email?: string;
          fullName?: string;
          waitlistId?: string;
        };

        if (!body.planId || !body.email || !body.fullName) {
          return Response.json({ error: "planId, email, and fullName are required." }, { status: 400 });
        }

        const result = await createRazorpayOrder({
          planId: body.planId,
          email: body.email,
          fullName: body.fullName,
          waitlistId: body.waitlistId,
        });

        if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

        const { recordPayment } = await import("@/lib/payments/store.server");
        await recordPayment({
          memberEmail: body.email,
          memberName: body.fullName,
          planId: body.planId,
          amountPaise: result.amount,
          currency: result.currency,
          orderId: result.orderId,
          status: "pending",
        });

        return Response.json(result);
      },
    },
  },
});
