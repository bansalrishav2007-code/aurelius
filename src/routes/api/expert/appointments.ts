import { createFileRoute } from "@tanstack/react-router";
import { requireExpertSession } from "@/lib/experts/guard.server";
import { listExpertBookings } from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/expert/appointments")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireExpertSession(request);
        if (!auth.ok) return auth.response;
        const appointments = await listExpertBookings(auth.session.email);
        return Response.json({ appointments, expert: auth.expert });
      },
    },
  },
});
