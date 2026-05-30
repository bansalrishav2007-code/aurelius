import { createFileRoute } from "@tanstack/react-router";
import { appendCookies, clearMemberSessionCookie } from "@/lib/auth/cookies.server";

export const Route = createFileRoute("/api/auth/sign-out")({
  server: {
    handlers: {
      POST: async () => {
        return appendCookies(Response.json({ ok: true }), [clearMemberSessionCookie()]);
      },
    },
  },
});
