import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { listNotifications, markNotificationRead } from "@/lib/notifications/store.server";

export const Route = createFileRoute("/api/member/notifications")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const notifications = await listNotifications(auth.session.email, auth.memberId);
        return Response.json({ notifications });
      },
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const body = (await request.json().catch(() => ({}))) as { action?: string; id?: string };
        if (body.action === "mark_read" && body.id) {
          await markNotificationRead(auth.session.email, auth.memberId, body.id);
          return Response.json({ ok: true });
        }
        return Response.json({ error: "Invalid action." }, { status: 400 });
      },
    },
  },
});
