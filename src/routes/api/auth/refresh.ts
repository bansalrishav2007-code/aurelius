import { createFileRoute } from "@tanstack/react-router";
import { appendCookies, getRefreshToken, setAccessTokenCookie } from "@/lib/auth/cookies.server";
import { refreshAuthSession } from "@/lib/auth/member-tokens.server";
import { resolveMemberSession } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/auth/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const refresh = getRefreshToken(request.headers.get("cookie"));
        if (!refresh) {
          return Response.json({ error: "No refresh token.", code: "SESSION_EXPIRED" }, { status: 401 });
        }

        const renewed = await refreshAuthSession(refresh);
        if (!renewed) {
          return Response.json({ error: "Your session expired. Please log in again.", code: "SESSION_EXPIRED" }, { status: 401 });
        }

        const session = await resolveMemberSession(request.headers.get("cookie"));
        return appendCookies(
          Response.json({ ok: true, session }),
          [setAccessTokenCookie(renewed.accessToken)],
        );
      },
    },
  },
});
