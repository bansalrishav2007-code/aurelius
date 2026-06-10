import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { enrichGoal } from "@/lib/goals/calculations";
import { analyzeGoalProgress } from "@/lib/goals/goal-analysis.server";
import { updateMemberGoal, listMemberGoals } from "@/lib/goals/store.server";

async function findGoal(email: string, goalId: string) {
  const goals = await listMemberGoals(email);
  return goals.find((g) => g.id === goalId);
}

export const Route = createFileRoute("/api/member/goals/$goalId/advise")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Goal AI advisor");
        }

        const raw = await findGoal(auth.session.email, params.goalId);
        if (!raw) return Response.json({ error: "Goal not found." }, { status: 404 });

        const goal = enrichGoal(raw);
        const advice = await analyzeGoalProgress(goal);
        await updateMemberGoal(auth.session.email, params.goalId, { aiAdvice: advice });

        return Response.json({ advice });
      },
    },
  },
});
