import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import {
  acceptSuggestedTime,
  cancelMemberBooking,
  listAllExperts,
  rateBooking,
} from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/member/expert-bookings/$bookingId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as {
          action?: "cancel" | "accept_suggested" | "rate";
          rating?: number;
          review?: string;
        };

        if (body.action === "cancel") {
          const booking = await cancelMemberBooking(params.bookingId, auth.session.email);
          if (!booking) return Response.json({ error: "Unable to cancel booking." }, { status: 400 });
          return Response.json({ booking });
        }

        if (body.action === "accept_suggested") {
          const booking = await acceptSuggestedTime(params.bookingId, auth.session.email);
          if (!booking) return Response.json({ error: "Unable to accept suggested time." }, { status: 400 });
          return Response.json({ booking });
        }

        if (body.action === "rate" && body.rating) {
          const booking = await rateBooking(params.bookingId, auth.session.email, body.rating, body.review);
          if (!booking) return Response.json({ error: "Unable to submit rating." }, { status: 400 });
          return Response.json({ booking });
        }

        return Response.json({ error: "Invalid action." }, { status: 400 });
      },
      GET: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const { listMemberBookings } = await import("@/lib/experts/store.server");
        const bookings = await listMemberBookings(auth.session.email);
        const booking = bookings.find((b) => b.id === params.bookingId);
        if (!booking) return Response.json({ error: "Booking not found." }, { status: 404 });

        const experts = await listAllExperts();
        const expert = experts.find((e) => e.id === booking.expertId);
        const startMs = new Date(booking.scheduledAt).getTime();
        const joinOpensAt = startMs - 10 * 60_000;
        const canJoin = booking.status === "confirmed" && Date.now() >= joinOpensAt && booking.meetingUrl;

        return Response.json({
          booking: { ...booking, expertName: expert?.name ?? "Expert", expertPhotoUrl: expert?.photoUrl },
          canJoin,
          joinOpensAt: new Date(joinOpensAt).toISOString(),
          meetingUrl: canJoin ? booking.meetingUrl : undefined,
        });
      },
    },
  },
});
