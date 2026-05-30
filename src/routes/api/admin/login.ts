import { createFileRoute } from "@tanstack/react-router";
import { createAdminSession, verifyAdminKey } from "@/lib/auth/service.server";
import { appendCookies, setAdminSessionCookie } from "@/lib/auth/cookies.server";

export const Route = createFileRoute("/api/admin/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { key?: string };
        if (!body.key?.trim()) {
          return Response.json({ error: "Admin key is required." }, { status: 400 });
        }

        const valid = await verifyAdminKey(body.key.trim());
        if (!valid) {
          return Response.json({ error: "Invalid admin credentials." }, { status: 403 });
        }

        const sessionId = await createAdminSession();
        return appendCookies(Response.json({ ok: true }), [setAdminSessionCookie(sessionId)]);
      },
    },
  },
});
