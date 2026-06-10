import { createFileRoute } from "@tanstack/react-router";
import { resolveMemberSession } from "@/lib/auth/service.server";
import {
  markIntroCallBooked,
  resolveOnboardingChecklist,
  unlockDashboard,
} from "@/lib/membership/service.server";

export const Route = createFileRoute("/api/member/onboarding-checklist")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await resolveMemberSession(request.headers.get("cookie"));
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const checklist = await resolveOnboardingChecklist(session.email);
        return Response.json(checklist);
      },
      PATCH: async ({ request }) => {
        const session = await resolveMemberSession(request.headers.get("cookie"));
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const body = (await request.json().catch(() => ({}))) as { introCallBooked?: boolean };
        if (body.introCallBooked) await markIntroCallBooked(session.email);
        const checklist = await resolveOnboardingChecklist(session.email);
        return Response.json(checklist);
      },
      POST: async ({ request }) => {
        const session = await resolveMemberSession(request.headers.get("cookie"));
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const body = (await request.json().catch(() => ({}))) as { action?: string };
        if (body.action === "unlock") {
          const ok = await unlockDashboard(session.email);
          if (!ok) {
            return Response.json({ error: "Complete required checklist items first." }, { status: 400 });
          }
        }
        const checklist = await resolveOnboardingChecklist(session.email);
        return Response.json({ ok: true, ...checklist });
      },
    },
  },
});
