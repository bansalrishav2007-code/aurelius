import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { createBookingPaymentOrder } from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/member/expert-bookings/$bookingId/pay")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const result = await createBookingPaymentOrder(params.bookingId, auth.session.email);
        if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
        return Response.json(result);
      },
    },
  },
});
