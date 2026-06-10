import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { createSupportTicket, listMemberSupportTickets } from "@/lib/support/store.server";

export const Route = createFileRoute("/api/member/support")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const tickets = await listMemberSupportTickets(auth.session.email);
        return Response.json({ tickets });
      },
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const body = (await request.json().catch(() => ({}))) as { subject?: string; message?: string };
        if (!body.message?.trim()) {
          return Response.json({ error: "Message is required." }, { status: 400 });
        }
        const ticket = await createSupportTicket({
          type: "support",
          name: auth.session.fullName,
          email: auth.session.email,
          subject: body.subject?.trim() || "Member support request",
          message: body.message.trim(),
        });
        return Response.json({ ticket });
      },
    },
  },
});
