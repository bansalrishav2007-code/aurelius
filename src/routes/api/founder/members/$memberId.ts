import { createFileRoute } from "@tanstack/react-router";
import { deleteMember, requireSuperAdmin, updateMember } from "@/lib/auth/founder.service.server";

export const Route = createFileRoute("/api/founder/members/$memberId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const cookie = request.headers.get("cookie");
        if (!(await requireSuperAdmin(cookie))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }
        const body = (await request.json().catch(() => ({}))) as {
          tier?: "founding" | "principal" | "family-office";
          role?: "member" | "ADMIN";
          subscription?: "none" | "active" | "past_due" | "cancelled";
          subscriptionPlan?: string;
          revoked?: boolean;
        };
        const ok = await updateMember(params.memberId, body);
        if (!ok) return Response.json({ error: "Member not found or cannot be modified." }, { status: 404 });
        return Response.json({ ok: true });
      },
      DELETE: async ({ request, params }) => {
        const cookie = request.headers.get("cookie");
        if (!(await requireSuperAdmin(cookie))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }
        const ok = await deleteMember(params.memberId);
        if (!ok) return Response.json({ error: "Member not found or cannot be deleted." }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
