import { createFileRoute } from "@tanstack/react-router";
import { createInvite, resolveAdminSession } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/admin/invites")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ok = await resolveAdminSession(request.headers.get("cookie"));
        if (!ok) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json().catch(() => ({}))) as {
          label?: string;
          tier?: "founding" | "principal" | "family-office";
          maxUses?: number;
          expiresInDays?: number | null;
          notes?: string;
          assignedEmail?: string;
        };

        try {
          const invite = await createInvite({
            label: body.label,
            tier: body.tier ?? "principal",
            maxUses: body.maxUses ?? 1,
            expiresInDays: body.expiresInDays ?? 30,
            notes: body.notes,
            assignedEmail: body.assignedEmail,
          });
          return Response.json({ invite });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Failed to create invite." },
            { status: 400 },
          );
        }
      },
    },
  },
});
