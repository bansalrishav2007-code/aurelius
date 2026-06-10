import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { enrichGoal, suggestGoalAction } from "@/lib/goals/calculations";
import { createMemberGoal, listMemberGoals } from "@/lib/goals/store.server";
import { getOrCreateProfile } from "@/lib/wealth/store.server";
import { computeWealthSummary } from "@/lib/wealth/calculations";

export const Route = createFileRoute("/api/member/goals")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        if (auth.session.isDemo) {
          const { getDemoGoals } = await import("@/lib/demo/mock-goals.server");
          const goals = getDemoGoals(auth.session.email);
          return Response.json({ goals, updatedAt: new Date().toISOString() });
        }

        const raw = await listMemberGoals(auth.session.email);
        const profile = await getOrCreateProfile(auth.session.email);
        const wealth = computeWealthSummary(profile);
        const goals = raw.map((g) => {
          const enriched = enrichGoal(g);
          return {
            ...enriched,
            aiSuggestion: g.aiSuggestion ?? suggestGoalAction(g, wealth.netWorth),
          };
        });
        const updatedAt = raw.reduce(
          (latest, g) => (g.updatedAt > latest ? g.updatedAt : latest),
          raw[0]?.updatedAt,
        );
        return Response.json({ goals, updatedAt });
      },
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Goal creation");
        }
        const body = (await request.json().catch(() => ({}))) as {
          title?: string;
          description?: string;
          category?: import("@/lib/goals/categories").GoalCategory;
          targetDate?: string;
          targetAmount?: number;
          currentAmount?: number;
          priority?: "high" | "medium" | "low";
        };
        if (!body.title?.trim()) {
          return Response.json({ error: "Goal title is required." }, { status: 400 });
        }
        const goal = await createMemberGoal(auth.session.email, {
          title: body.title,
          description: body.description,
          category: body.category,
          targetDate: body.targetDate,
          targetAmount: body.targetAmount,
          currentAmount: body.currentAmount,
          priority: body.priority,
        });
        return Response.json({ goal: enrichGoal(goal) });
      },
    },
  },
});
