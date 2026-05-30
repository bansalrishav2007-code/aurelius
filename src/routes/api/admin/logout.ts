import { createFileRoute } from "@tanstack/react-router";
import { appendCookies, clearAdminSessionCookie, getAdminSessionId } from "@/lib/auth/cookies.server";
import { destroyAdminSession } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/admin/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sessionId = getAdminSessionId(request.headers.get("cookie"));
        if (sessionId) {
          await destroyAdminSession(sessionId);
        }
        return appendCookies(Response.json({ ok: true }), [clearAdminSessionCookie()]);
      },
    },
  },
});
