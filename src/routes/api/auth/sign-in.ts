import { createFileRoute } from "@tanstack/react-router";
import { signInMember } from "@/lib/auth/service.server";
import { appendCookies, setMemberSessionCookie } from "@/lib/auth/cookies.server";

export const Route = createFileRoute("/api/auth/sign-in")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
        if (!body.email?.trim()) {
          return Response.json({ error: "Email is required." }, { status: 400 });
        }

        const result = await signInMember(body.email, body.password);
        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 403 });
        }

        return appendCookies(Response.json({ ok: true, session: result.session }), [
          setMemberSessionCookie(result.sessionId),
        ]);
      },
    },
  },
});
