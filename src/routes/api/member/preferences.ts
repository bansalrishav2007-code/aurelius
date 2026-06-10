import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { getMemberPreferences, updateMemberPreferences } from "@/lib/member/preferences.server";
import { logAuditEvent } from "@/lib/audit/store.server";

export const Route = createFileRoute("/api/member/preferences")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const prefs = await getMemberPreferences(auth.memberId, auth.session.email);
        return Response.json({ preferences: prefs });
      },
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const prefs = await updateMemberPreferences(auth.memberId, auth.session.email, body);
        await logAuditEvent({
          memberId: auth.memberId,
          memberEmail: auth.session.email,
          action: "update",
          resourceType: "preferences",
          detail: "Member preferences updated",
          severity: "info",
        });
        return Response.json({ ok: true, preferences: prefs });
      },
    },
  },
});
