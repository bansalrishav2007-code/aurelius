import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { deleteMemberGoal, updateMemberGoal } from "@/lib/goals/store.server";

export const Route = createFileRoute("/api/member/goals/$goalId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Goal editing");
        }
        const body = (await request.json().catch(() => ({}))) as {
          title?: string;
          description?: string;
          targetDate?: string;
          targetAmount?: number;
          currentAmount?: number;
          priority?: "high" | "medium" | "low";
          status?: "active" | "completed";
        };
        const goal = await updateMemberGoal(auth.session.email, params.goalId, body);
        if (!goal) return Response.json({ error: "Goal not found." }, { status: 404 });
        return Response.json({ goal });
      },
      DELETE: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Goal deletion");
        }
        const ok = await deleteMemberGoal(auth.session.email, params.goalId);
        if (!ok) return Response.json({ error: "Goal not found." }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
