import { createFileRoute } from "@tanstack/react-router";
import { requireSuperAdmin } from "@/lib/auth/founder.service.server";
import { replyToTicket } from "@/lib/support/store.server";

export const Route = createFileRoute("/api/founder/support/$ticketId/reply")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const cookie = request.headers.get("cookie");
        if (!(await requireSuperAdmin(cookie))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }
        const body = (await request.json().catch(() => ({}))) as { message?: string };
        if (!body.message?.trim()) {
          return Response.json({ error: "Message is required." }, { status: 400 });
        }
        const ticket = await replyToTicket(params.ticketId, body.message.trim());
        if (!ticket) return Response.json({ error: "Ticket not found." }, { status: 404 });
        return Response.json({ ticket });
      },
    },
  },
});
