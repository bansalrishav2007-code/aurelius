import { createFileRoute } from "@tanstack/react-router";
import { requireSuperAdmin } from "@/lib/auth/founder.service.server";
import { setTicketStatus } from "@/lib/support/store.server";

export const Route = createFileRoute("/api/founder/support/$ticketId/status")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const cookie = request.headers.get("cookie");
        if (!(await requireSuperAdmin(cookie))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }
        const body = (await request.json().catch(() => ({}))) as { status?: "open" | "resolved" };
        if (!body.status) {
          return Response.json({ error: "status is required." }, { status: 400 });
        }
        const ticket = await setTicketStatus(params.ticketId, body.status);
        if (!ticket) return Response.json({ error: "Ticket not found." }, { status: 404 });
        return Response.json({ ticket });
      },
    },
  },
});
