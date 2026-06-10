import { createFileRoute } from "@tanstack/react-router";
import { appendCookies, setMemberSessionCookie } from "@/lib/auth/cookies.server";
import { createOrResumeDemoAccount } from "@/lib/demo/service.server";

export const Route = createFileRoute("/api/auth/demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          firstName?: string;
          email?: string;
          purpose?: string;
        };

        console.info("[Aurelius] Demo signup request", { email: body.email?.trim().toLowerCase() });

        const result = await createOrResumeDemoAccount({
          firstName: body.firstName?.trim() ?? "",
          email: body.email?.trim().toLowerCase() ?? "",
          purpose: body.purpose?.trim(),
        });

        if (!result.ok) {
          console.warn("[Aurelius] Demo signup rejected", { error: result.error });
          return Response.json({ error: result.error, code: "DEMO_SIGNUP_FAILED" }, { status: 400 });
        }

        console.info("[Aurelius] Demo session created", {
          email: result.session.email,
          sessionId: result.sessionId,
        });

        return appendCookies(Response.json({ ok: true, session: result.session }), [
          setMemberSessionCookie(result.sessionId),
        ]);
      },
    },
  },
});
