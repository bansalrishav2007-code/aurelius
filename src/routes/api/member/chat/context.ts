import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { computeWealthSummary } from "@/lib/wealth/calculations";
import { getOrCreateProfile } from "@/lib/wealth/store.server";

export const Route = createFileRoute("/api/member/chat/context")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const profile = await getOrCreateProfile(auth.session.email);
        const summary = computeWealthSummary(profile);
        const report = profile.intelligenceReport;

        const tax = profile.taxSnapshot;
        const unused80C = Math.max(0, (tax?.limit80C ?? 1_50_000) - (tax?.used80C ?? 0));

        return Response.json({
          netWorth: summary.netWorth,
          healthScore: summary.healthScore,
          unused80CHeadroom: unused80C,
          alerts: summary.alerts ?? [],
          intelligenceBrief: report?.status === "ready"
            ? {
                summary: report.summaryLine,
                recommendations: report.recommendations?.slice(0, 3) ?? [],
                updatedAt: report.preparedAt,
              }
            : null,
          updatedAt: profile.updatedAt,
        });
      },
    },
  },
});
