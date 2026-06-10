import { createFileRoute } from "@tanstack/react-router";
import { resolveAdminSession } from "@/lib/auth/service.server";
import { logAdminActivity, suspendMember, updateMemberTier } from "@/lib/membership/service.server";

export const Route = createFileRoute("/api/admin/membership/members/$memberId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const authed = await resolveAdminSession(request.headers.get("cookie"));
        if (!authed) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const body = (await request.json().catch(() => ({}))) as {
          tier?: "founding" | "principal" | "family-office";
          suspended?: boolean;
        };

        if (body.tier) {
          const ok = await updateMemberTier(params.memberId, body.tier);
          if (!ok) return Response.json({ error: "Member not found." }, { status: 404 });
          await logAdminActivity("tier_changed", `Member ${params.memberId} tier → ${body.tier}`);
        }

        if (typeof body.suspended === "boolean") {
          const ok = await suspendMember(params.memberId, body.suspended);
          if (!ok) return Response.json({ error: "Member not found." }, { status: 404 });
          await logAdminActivity(
            body.suspended ? "member_suspended" : "member_unsuspended",
            `Member ${params.memberId}`,
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
