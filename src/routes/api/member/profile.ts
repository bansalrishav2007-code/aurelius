import { createFileRoute } from "@tanstack/react-router";
import { getMemberProfile, updateMemberProfile } from "@/lib/auth/service.server";
import { resolveMemberSession } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/member/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await resolveMemberSession(request.headers.get("cookie"));
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const profile = await getMemberProfile(session.email);
        if (!profile) return Response.json({ error: "Profile not found." }, { status: 404 });
        return Response.json({ profile });
      },
      PATCH: async ({ request }) => {
        const session = await resolveMemberSession(request.headers.get("cookie"));
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const body = (await request.json().catch(() => ({}))) as { fullName?: string };
        const result = await updateMemberProfile(session.email, { fullName: body.fullName });
        if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
        return Response.json(result);
      },
    },
  },
});
