import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { listConversations } from "@/lib/chat/conversations.server";
import { buildDemoOverview } from "@/lib/demo/mock-overview.server";
import { listMemberGoals } from "@/lib/goals/store.server";
import { fetchMacroIndicators } from "@/lib/market/indicators.server";
import { computeWealthSummary } from "@/lib/wealth/calculations";
import { getOrCreateProfile } from "@/lib/wealth/store.server";
import { listMemberDocuments } from "@/lib/vault/store.server";

export const Route = createFileRoute("/api/member/overview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const demo = buildDemoOverview(auth.session);
          const { indicators } = await fetchMacroIndicators().catch(() => ({
            indicators: [],
            updatedAt: new Date().toISOString(),
          }));
          const sensex = indicators.find((i) => i.id === "sensex");
          const nifty = indicators.find((i) => i.id === "nifty");
          const gold = indicators.find((i) => i.id === "gold");
          return Response.json({
            ...demo,
            wealthSummary: {
              netWorth: 2_45_00_000,
              healthScore: 72,
              healthLabel: "Moderate",
              updatedAt: new Date().toISOString(),
              hasData: true,
            },
            marketSnapshot: {
              sensex: { value: sensex?.value ?? "82,450", changePercent: sensex?.changePercent ?? 0.42 },
              nifty: { value: nifty?.value ?? "25,120", changePercent: nifty?.changePercent ?? 0.38 },
              gold: { value: gold?.value ?? "₹72,500", changePercent: gold?.changePercent ?? 0.15 },
            },
            intelligenceSnippet: "Rebalance equity exposure before March LTCG harvesting window closes.",
          });
        }

        const email = auth.session.email;
        const [documents, conversations, goals, profile, macro] = await Promise.all([
          listMemberDocuments(email),
          listConversations(email),
          listMemberGoals(email),
          getOrCreateProfile(email),
          fetchMacroIndicators().catch(() => ({ indicators: [], updatedAt: new Date().toISOString() })),
        ]);

        const wealth = computeWealthSummary(profile);
        const activeGoals = goals.filter((g) => g.status === "active");
        const sensex = macro.indicators.find((i) => i.id === "sensex");
        const nifty = macro.indicators.find((i) => i.id === "nifty");
        const gold = macro.indicators.find((i) => i.id === "gold");

        const report = profile.intelligenceReport;
        const intelligenceSnippet =
          report?.recommendations?.[0]?.title ??
          report?.summaryLine ??
          (wealth.netWorth > 0 ? "Review your Intelligence Brief for personalised portfolio actions." : null);

        return Response.json({
          session: auth.session,
          member: {
            createdAt: profile.accountCreatedAt ?? profile.updatedAt,
            expiresAt: auth.session.expiresAt ?? new Date(Date.now() + 365 * 86_400_000).toISOString(),
            subscription: auth.session.subscription ?? "active",
            subscriptionPlan: auth.session.subscriptionPlan,
          },
          stats: {
            documentCount: documents.length,
            conversationCount: conversations.length,
            activeGoals: activeGoals.length,
            openTickets: 0,
          },
          recentDocuments: documents.slice(0, 5).map((d) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            uploadedAt: d.uploadedAt,
            status: d.status,
          })),
          recentConversations: conversations.slice(0, 5).map((c) => ({
            id: c.id,
            title: c.title,
            updatedAt: c.updatedAt,
            messageCount: c.messages.length,
          })),
          activeGoals: activeGoals.slice(0, 5),
          wealth: {
            allocation: wealth.allocation.map((s) => ({
              name: s.name,
              value: s.value,
              color: s.color,
            })),
            liabilityTrend: [],
            hasData: profile.assets.length > 0,
          },
          wealthSummary: {
            netWorth: wealth.netWorth,
            healthScore: wealth.healthScore.score,
            healthLabel: wealth.healthScore.bandLabel,
            updatedAt: profile.updatedAt,
            hasData: profile.assets.length > 0,
          },
          marketSnapshot: {
            sensex: { value: sensex?.value ?? "—", changePercent: sensex?.changePercent ?? null },
            nifty: { value: nifty?.value ?? "—", changePercent: nifty?.changePercent ?? null },
            gold: { value: gold?.value ?? "—", changePercent: gold?.changePercent ?? null },
          },
          intelligenceSnippet,
        });
      },
    },
  },
});
