import { createFileRoute } from "@tanstack/react-router";
import { createSupportTicket } from "@/lib/support/store.server";

export const Route = createFileRoute("/api/support")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          name?: string;
          email?: string;
          subject?: string;
          message?: string;
        };
        if (!body.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
          return Response.json({ error: "Name, email, and message are required." }, { status: 400 });
        }
        const ticket = await createSupportTicket({
          type: "contact",
          name: body.name.trim(),
          email: body.email.trim().toLowerCase(),
          subject: body.subject?.trim() || "General enquiry",
          message: body.message.trim(),
        });
        return Response.json({ ok: true, id: ticket.id });
      },
    },
  },
});
