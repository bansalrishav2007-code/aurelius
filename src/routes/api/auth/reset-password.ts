import { createFileRoute } from "@tanstack/react-router";
import { resetPassword } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
        if (!body.token || !body.password) {
          return Response.json({ error: "Token and password are required." }, { status: 400 });
        }
        const result = await resetPassword(body.token, body.password);
        if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
        return Response.json({ ok: true });
      },
    },
  },
});
