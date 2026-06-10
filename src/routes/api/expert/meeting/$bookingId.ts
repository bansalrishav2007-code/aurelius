import { createFileRoute } from "@tanstack/react-router";
import { requireExpertSession } from "@/lib/experts/guard.server";
import { listExpertBookings } from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/expert/meeting/$bookingId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireExpertSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as { joinCode?: string };
        const appointments = await listExpertBookings(auth.session.email);
        const booking = appointments.find((a) => a.id === params.bookingId);

        if (!booking || booking.status !== "confirmed") {
          return Response.json({ error: "Meeting not available." }, { status: 404 });
        }

        if (!body.joinCode || body.joinCode.toUpperCase() !== booking.expertJoinCode) {
          return Response.json({ error: "Invalid expert join code." }, { status: 403 });
        }

        const startMs = new Date(booking.scheduledAt).getTime();
        const joinOpensAt = startMs - 10 * 60_000;

        return Response.json({
          meetingUrl: booking.meetingUrl,
          canJoin: Date.now() >= joinOpensAt,
          joinOpensAt: new Date(joinOpensAt).toISOString(),
        });
      },
    },
  },
});
