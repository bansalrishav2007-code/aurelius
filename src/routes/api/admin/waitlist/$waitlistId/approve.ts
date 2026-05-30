import { createFileRoute } from "@tanstack/react-router";
import { resolveAdminSession, approveWaitlistApplication } from "@/lib/auth/service.server";
import type { InviteCode } from "@/lib/auth/types";

export const Route = createFileRoute("/api/admin/waitlist/$waitlistId/approve")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const authed = await resolveAdminSession(request.headers.get("cookie"));
        if (!authed) {
          return Response.json({ error: "Admin session required." }, { status: 401 });
        }

        const body = (await request.json().catch(() => ({}))) as {
          tier?: InviteCode["tier"];
          expiresInDays?: number | null;
        };

        const result = await approveWaitlistApplication(params.waitlistId, {
          tier: body.tier,
          expiresInDays: body.expiresInDays ?? 30,
        });

        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        return Response.json({
          ok: true,
          invite: result.invite,
          application: result.application,
          emailSent: result.emailResult.sent,
          emailPreview: result.emailResult.sent ? undefined : result.emailResult.devPreview,
          emailNote: result.emailResult.sent ? undefined : result.emailResult.reason,
        });
      },
    },
  },
});
