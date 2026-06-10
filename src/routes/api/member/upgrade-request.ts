import { createFileRoute } from "@tanstack/react-router";
import { resolveMemberSession } from "@/lib/auth/service.server";
import { logAdminActivity, submitUpgradeRequest } from "@/lib/membership/service.server";

export const Route = createFileRoute("/api/member/upgrade-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await resolveMemberSession(request.headers.get("cookie"));
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const body = (await request.json().catch(() => ({}))) as {
          requestedTier?: "founding" | "principal" | "family-office";
          reason?: string;
        };

        if (!body.requestedTier) {
          return Response.json({ error: "Requested tier is required." }, { status: 400 });
        }

        if (body.requestedTier === session.tier) {
          return Response.json({ error: "You are already on this tier." }, { status: 400 });
        }

        const result = await submitUpgradeRequest({
          memberEmail: session.email,
          memberName: session.fullName,
          currentTier: session.tier,
          requestedTier: body.requestedTier,
          reason: body.reason,
        });

        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        await logAdminActivity(
          "upgrade_requested",
          `${session.fullName} requested upgrade from ${session.tier} to ${body.requestedTier}`,
        );

        return Response.json({ ok: true, id: result.id });
      },
    },
  },
});
