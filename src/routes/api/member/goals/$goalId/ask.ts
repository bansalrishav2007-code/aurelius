import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { enrichGoal } from "@/lib/goals/calculations";
import { askAboutGoal } from "@/lib/goals/goal-analysis.server";
import { listMemberGoals } from "@/lib/goals/store.server";

export const Route = createFileRoute("/api/member/goals/$goalId/ask")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Goal Q&A");
        }

        const body = (await request.json().catch(() => ({}))) as { question?: string };
        const question = body.question?.trim();
        if (!question) {
          return Response.json({ error: "question is required." }, { status: 400 });
        }

        const raw = (await listMemberGoals(auth.session.email)).find((g) => g.id === params.goalId);
        if (!raw) return Response.json({ error: "Goal not found." }, { status: 404 });

        const goal = enrichGoal(raw);
        const answer = await askAboutGoal(goal, question, raw.aiAdvice);

        return Response.json({ answer });
      },
    },
  },
});
