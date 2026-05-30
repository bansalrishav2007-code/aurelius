import { createFileRoute } from "@tanstack/react-router";
import { previewInviteCode } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/auth/verify-invite")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { code?: string; email?: string };
        if (!body.code?.trim()) {
          return Response.json({ valid: false, error: "Invitation code is required." }, { status: 400 });
        }
        const result = await previewInviteCode(body.code, body.email);
        return Response.json(result);
      },
    },
  },
});
