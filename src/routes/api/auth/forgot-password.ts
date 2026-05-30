import { createFileRoute } from "@tanstack/react-router";
import { requestPasswordReset } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/auth/forgot-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { email?: string };
        if (!body.email?.trim()) {
          return Response.json({ error: "Email is required." }, { status: 400 });
        }
        const result = await requestPasswordReset(body.email);
        if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
        return Response.json({
          ok: true,
          message: "If a membership exists for this email, reset instructions have been issued.",
          devToken: result.devToken,
        });
      },
    },
  },
});
