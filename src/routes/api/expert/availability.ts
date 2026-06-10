import { createFileRoute } from "@tanstack/react-router";
import { requireExpertSession } from "@/lib/experts/guard.server";
import { updateExpertAvailability } from "@/lib/experts/store.server";
import type { ExpertAvailability } from "@/lib/experts/types";

export const Route = createFileRoute("/api/expert/availability")({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        const auth = await requireExpertSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as { availability?: ExpertAvailability };
        if (!body.availability) {
          return Response.json({ error: "Availability schedule is required." }, { status: 400 });
        }

        const expert = await updateExpertAvailability(auth.session.email, body.availability);
        if (!expert) return Response.json({ error: "Expert not found." }, { status: 404 });
        return Response.json({ expert });
      },
    },
  },
});
