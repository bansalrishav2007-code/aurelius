import { createFileRoute } from "@tanstack/react-router";
import { requireExpertSession } from "@/lib/experts/guard.server";
import { updateBookingStatus } from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/expert/appointments/$bookingId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const auth = await requireExpertSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as {
          status?: "confirmed" | "rejected" | "completed";
          action?: "suggest_time";
          expertNotes?: string;
          sessionNotes?: string;
          declineReason?: string;
          suggestedTime?: string;
        };

        if (body.action === "suggest_time" && body.suggestedTime) {
          const { suggestBookingTime } = await import("@/lib/experts/store.server");
          const booking = await suggestBookingTime(
            params.bookingId,
            auth.session.email,
            body.suggestedTime,
            body.declineReason,
          );
          if (!booking) return Response.json({ error: "Unable to suggest new time." }, { status: 400 });
          return Response.json({ booking });
        }

        if (!body.status) {
          return Response.json({ error: "Status is required." }, { status: 400 });
        }

        const booking = await updateBookingStatus(params.bookingId, auth.session.email, body.status, {
          expertNotes: body.expertNotes ?? body.sessionNotes,
          declineReason: body.declineReason,
          suggestedTime: body.suggestedTime,
        });
        if (!booking) return Response.json({ error: "Unable to update appointment." }, { status: 400 });
        return Response.json({ booking });
      },
    },
  },
});
