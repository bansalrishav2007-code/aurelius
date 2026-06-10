import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/auth/guard.server";
import {
  adminUpdateBooking,
  getBookingStats,
  listAllBookings,
  listAllExperts,
} from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/admin/bookings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireAdminSession(request);
        if (!auth.ok) return auth.response;

        const url = new URL(request.url);
        const status = url.searchParams.get("status");
        let bookings = await listAllBookings();
        if (status && status !== "all") {
          bookings = bookings.filter((b) => b.status === status);
        }

        const stats = await getBookingStats();
        const experts = await listAllExperts();
        const expertStats = experts
          .filter((e) => e.status === "active")
          .map((e) => {
            const eb = bookings.filter((b) => b.expertId === e.id);
            const completed = eb.filter((b) => b.status === "completed");
            const accepted = eb.filter((b) => ["confirmed", "completed"].includes(b.status));
            return {
              id: e.id,
              name: e.name,
              totalBookings: eb.length,
              acceptanceRate: eb.length ? Math.round((accepted.length / eb.length) * 100) : 0,
              rating: e.rating,
              clientsServed: e.clientsServed,
            };
          });

        return Response.json({ bookings, stats, expertStats });
      },
      PATCH: async ({ request }) => {
        const auth = await requireAdminSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as {
          bookingId?: string;
          action?: "confirm" | "reject" | "cancel" | "complete";
          declineReason?: string;
          suggestedTime?: string;
        };

        if (!body.bookingId || !body.action) {
          return Response.json({ error: "bookingId and action required." }, { status: 400 });
        }

        const booking = await adminUpdateBooking(body.bookingId, body.action, {
          declineReason: body.declineReason,
          suggestedTime: body.suggestedTime,
        });
        if (!booking) return Response.json({ error: "Unable to update booking." }, { status: 400 });
        return Response.json({ booking });
      },
    },
  },
});
