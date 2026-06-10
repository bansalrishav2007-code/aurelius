import { createFileRoute } from "@tanstack/react-router";
import { appendCookies, clearAuthCookies, getRefreshToken } from "@/lib/auth/cookies.server";
import { revokeSessionByRefreshToken } from "@/lib/auth/member-tokens.server";

export const Route = createFileRoute("/api/auth/sign-out")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const refresh = getRefreshToken(request.headers.get("cookie"));
        if (refresh) await revokeSessionByRefreshToken(refresh);
        return appendCookies(Response.json({ ok: true }), clearAuthCookies());
      },
    },
  },
});
