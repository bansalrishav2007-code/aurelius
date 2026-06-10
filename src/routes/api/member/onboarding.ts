import { createFileRoute } from "@tanstack/react-router";
import { completeMemberOnboarding } from "@/lib/auth/service.server";
import { resolveMemberSession } from "@/lib/auth/service.server";
import { createMemberGoal } from "@/lib/goals/store.server";

export const Route = createFileRoute("/api/member/onboarding")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await resolveMemberSession(request.headers.get("cookie"));
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const body = (await request.json().catch(() => ({}))) as {
          fullName?: string;
          profession?: string;
          firm?: string;
          goals?: { title: string; description?: string; targetDate?: string }[];
        };

        const result = await completeMemberOnboarding(session.email, {
          fullName: body.fullName,
          profession: body.profession,
          firm: body.firm,
        });
        if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

        const goals = body.goals ?? [];
        for (const goal of goals) {
          if (goal.title?.trim()) {
            await createMemberGoal(session.email, {
              title: goal.title,
              description: goal.description,
              targetDate: goal.targetDate,
            });
          }
        }

        return Response.json({ ok: true, session: result.session });
      },
    },
  },
});
