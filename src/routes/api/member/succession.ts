import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import {
  buildSuccessionAiRecommendation,
  getSuccessionPlan,
  saveSuccessionPlan,
} from "@/lib/succession/store.server";
import { getOrCreateProfile } from "@/lib/wealth/store.server";
import { computeWealthSummary } from "@/lib/wealth/calculations";

export const Route = createFileRoute("/api/member/succession")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const plan = await getSuccessionPlan(auth.session.email);
        const profile = await getOrCreateProfile(auth.session.email);
        const wealth = computeWealthSummary(profile);
        const aiRecommendation = buildSuccessionAiRecommendation(plan, wealth.netWorth);

        return Response.json({ plan: { ...plan, aiRecommendation } });
      },
      PUT: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Succession planning");
        }

        const body = (await request.json().catch(() => ({}))) as Partial<import("@/lib/succession/types").SuccessionPlan>;
        const existing = await getSuccessionPlan(auth.session.email);
        const plan = await saveSuccessionPlan({
          ...existing,
          ...body,
          memberEmail: auth.session.email,
        });

        const profile = await getOrCreateProfile(auth.session.email);
        const wealth = computeWealthSummary(profile);

        return Response.json({
          plan: { ...plan, aiRecommendation: buildSuccessionAiRecommendation(plan, wealth.netWorth) },
        });
      },
    },
  },
});
