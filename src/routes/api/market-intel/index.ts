import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { fetchMacroIndicators } from "@/lib/market/indicators.server";
import { generateMarketBrief, getCachedBrief } from "@/lib/market/brief.server";
import { fetchMarketNews } from "@/lib/market/news.server";
import { buildPortfolioRelevance } from "@/lib/market/relevance.server";
import type { NewsFilterTab } from "@/lib/market/types";

export const Route = createFileRoute("/api/market-intel/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const url = new URL(request.url);
        const newsFilter = (url.searchParams.get("newsFilter") ?? "All") as NewsFilterTab;
        const refreshBrief = url.searchParams.get("refreshBrief") === "1";

        const [{ items: news, configured: newsConfigured }, { indicators, updatedAt: indicatorsAt }] =
          await Promise.all([fetchMarketNews(newsFilter), fetchMacroIndicators()]);

        let brief = getCachedBrief(auth.session.email);
        if (!brief || refreshBrief) {
          if (auth.session.isDemo) {
            brief = {
              content: `India Macro: Policy stability and domestic liquidity support a constructive backdrop for diversified HNI portfolios this session.

Global: US rate expectations continue to steer EM fund flows — watch USD/INR for remittance and import-sensitive businesses.

Sector Watch: Quality financials and defensives merit attention as earnings clarify margin trajectories.

Action: Hold — maintain strategic equity allocation; review idle cash above six months of expenses for phased deployment.`,
              generatedAt: new Date().toISOString(),
            };
          } else {
            brief = await generateMarketBrief(auth.session.email);
          }
        }

        const relevance = auth.session.isDemo
          ? [
              {
                id: "demo-1",
                headline: news[1]?.headline ?? "NIFTY holds gains as FII inflows resume",
                explanation:
                  "With significant equity exposure in your demo portfolio, index direction directly affects net worth.",
                category: "Markets" as const,
              },
              {
                id: "demo-2",
                headline: news.find((n) => n.category === "Real Estate")?.headline ?? "Metro property demand stays firm",
                explanation: "Real estate holdings are rate-sensitive — RBI headlines matter for valuation and liquidity.",
                category: "Real Estate" as const,
              },
              {
                id: "demo-3",
                headline: "80C planning window — ELSS and PPF deadlines approach",
                explanation: "Unused 80C headroom in your tax snapshot makes regulation and budget news especially relevant.",
                category: "Tax" as const,
              },
            ]
          : await buildPortfolioRelevance(auth.session.email, news);

        const featured = news[0] ?? null;

        return Response.json({
          news,
          newsConfigured,
          featured,
          indicators,
          indicatorsAt,
          brief,
          relevance,
        });
      },
    },
  },
});
