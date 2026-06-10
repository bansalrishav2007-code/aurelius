import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { confirmBookingPayment } from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/member/expert-bookings/$bookingId/confirm")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as { orderId?: string };
        const result = await confirmBookingPayment(params.bookingId, auth.session.email, body.orderId);
        if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
        return Response.json({ booking: result.booking });
      },
    },
  },
});
