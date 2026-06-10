import { createFileRoute } from "@tanstack/react-router";
import { requireExpertSession } from "@/lib/experts/guard.server";
import { getBookingClientBrief } from "@/lib/experts/store.server";
import { getMemberWealthOverview } from "@/lib/wealth/store.server";
import { formatInr } from "@/lib/wealth/calculations";

export const Route = createFileRoute("/api/expert/appointments/$bookingId/brief")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireExpertSession(request);
        if (!auth.ok) return auth.response;

        const brief = await getBookingClientBrief(params.bookingId, auth.session.email);
        if (!brief) return Response.json({ error: "Brief not available." }, { status: 404 });

        const { listExpertBookings } = await import("@/lib/experts/store.server");
        const appointments = await listExpertBookings(auth.session.email);
        const booking = appointments.find((a) => a.id === params.bookingId);
        let wealthSnapshot: { netWorth?: string; healthScore?: number; mainConcern?: string } = {};

        if (booking) {
          const overview = await getMemberWealthOverview(booking.memberEmail).catch(() => null);
          if (overview) {
            wealthSnapshot = {
              netWorth: formatInr(overview.netWorth),
              healthScore: overview.healthScore?.score,
            };
          }
        }

        return Response.json({ brief, wealthSnapshot, agenda: booking?.agenda });
      },
    },
  },
});
