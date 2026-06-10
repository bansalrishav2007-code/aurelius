import { createFileRoute } from "@tanstack/react-router";
import { resolveAdminSession } from "@/lib/auth/service.server";
import { getMembershipSettings, setInviteOnlyMode } from "@/lib/membership/settings.server";
import { logAdminActivity } from "@/lib/membership/service.server";

export const Route = createFileRoute("/api/admin/membership/settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authed = await resolveAdminSession(request.headers.get("cookie"));
        if (!authed) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const settings = await getMembershipSettings();
        return Response.json(settings);
      },
      PUT: async ({ request }) => {
        const authed = await resolveAdminSession(request.headers.get("cookie"));
        if (!authed) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const body = (await request.json().catch(() => ({}))) as { inviteOnlyMode?: boolean };
        if (typeof body.inviteOnlyMode !== "boolean") {
          return Response.json({ error: "inviteOnlyMode boolean required." }, { status: 400 });
        }

        const settings = await setInviteOnlyMode(body.inviteOnlyMode);
        await logAdminActivity(
          "invite_only_toggle",
          `Invite-only mode ${body.inviteOnlyMode ? "ON" : "OFF"}`,
        );
        return Response.json(settings);
      },
    },
  },
});
