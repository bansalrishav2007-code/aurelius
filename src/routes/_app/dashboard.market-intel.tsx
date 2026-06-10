import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { TierGate } from "@/components/membership/TierGate";
import { MarketNewsFeed } from "@/components/market-intel/MarketNewsFeed";
import { MacroIndicatorsBar } from "@/components/market-intel/MacroIndicatorsBar";
import { IntelligenceBriefCard } from "@/components/market-intel/IntelligenceBriefCard";
import { PortfolioRelevancePanel } from "@/components/market-intel/PortfolioRelevancePanel";
import { fetchMarketIntel, regenerateMarketBrief } from "@/lib/member/client";
import { articleMatchesPrefs, loadMarketTopicPrefs, saveMarketTopicPrefs } from "@/lib/market/preferences";
import type { MarketTopicPreference } from "@/lib/market/types";
import { MARKET_TOPIC_OPTIONS } from "@/lib/market/types";
import type {
  MacroIndicator,
  MarketBrief,
  MarketNewsItem,
  NewsFilterTab,
  RelevanceCard,
} from "@/lib/market/types";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/dashboard/market-intel")({
  head: () => ({ meta: [{ title: "Market Intel — Aurelius" }] }),
  component: MarketIntelPage,
});

const REFRESH_MS = 5 * 60 * 1000;

function MarketIntelPage() {
  const { session } = AppRoute.useRouteContext();
  const isDemo = session.isDemo === true;

  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(false);
  const [refreshingBrief, setRefreshingBrief] = useState(false);
  const [newsFilter, setNewsFilter] = useState<NewsFilterTab>("All");
  const [showPrefs, setShowPrefs] = useState(false);
  const [topicPrefs, setTopicPrefs] = useState<MarketTopicPreference[]>([]);

  const [news, setNews] = useState<MarketNewsItem[]>([]);
  const [newsConfigured, setNewsConfigured] = useState(true);
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [indicatorsAt, setIndicatorsAt] = useState<string>();
  const [brief, setBrief] = useState<MarketBrief>();
  const [relevance, setRelevance] = useState<RelevanceCard[]>([]);

  useEffect(() => {
    setTopicPrefs(loadMarketTopicPrefs());
  }, []);

  const filteredNews = useMemo(
    () => news.filter((n) => articleMatchesPrefs(n.headline, n.description ?? "", n.category, topicPrefs)),
    [news, topicPrefs],
  );

  const loadAll = useCallback(async (refreshBrief = false) => {
    setLoading(true);
    try {
      const data = await fetchMarketIntel({ newsFilter, refreshBrief });
      setNews(data.news);
      setNewsConfigured(data.newsConfigured);
      setIndicators(data.indicators);
      setIndicatorsAt(data.indicatorsAt);
      setBrief(data.brief);
      setRelevance(data.relevance);
    } catch {
      toast.error("Unable to load market intelligence.");
    } finally {
      setLoading(false);
    }
  }, [newsFilter]);

  const loadNews = useCallback(async (filter: NewsFilterTab) => {
    setNewsLoading(true);
    try {
      const data = await fetchMarketIntel({ newsFilter: filter });
      setNews(data.news);
      setNewsConfigured(data.newsConfigured);
    } catch {
      toast.error("Unable to refresh news feed.");
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadNews(newsFilter);
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadNews, newsFilter]);

  function handleFilterChange(filter: NewsFilterTab) {
    setNewsFilter(filter);
    void loadNews(filter);
  }

  function toggleTopicPref(pref: MarketTopicPreference) {
    const next = topicPrefs.includes(pref)
      ? topicPrefs.filter((p) => p !== pref)
      : [...topicPrefs, pref];
    setTopicPrefs(next);
    saveMarketTopicPrefs(next);
  }

  async function handleRefreshBrief() {
    if (isDemo) {
      toast.info("Brief refresh is locked in demo mode.");
      return;
    }
    setRefreshingBrief(true);
    try {
      const { brief: next } = await regenerateMarketBrief();
      setBrief(next);
      toast.success("Intelligence brief updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to refresh brief.");
    } finally {
      setRefreshingBrief(false);
    }
  }

  if (loading) {
    return (
      <TierGate session={session} feature="market_intelligence" title="Market Intel">
        <div className="p-5 lg:p-10 max-w-[1600px] mx-auto">
          <PageSkeleton rows={5} />
        </div>
      </TierGate>
    );
  }

  return (
    <TierGate session={session} feature="market_intelligence" title="Market Intel">
      <div className="p-5 lg:p-10 max-w-[1600px] mx-auto min-w-0 space-y-6">
        <PageHeader
          title="Market Intel"
          subtitle="Curated financial news, macro data, and AI-powered insights for your portfolio."
        >
          <button
            type="button"
            onClick={() => setShowPrefs(!showPrefs)}
            className="hairline h-9 px-3 rounded-lg text-xs inline-flex items-center gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filter preferences
          </button>
          <BarChart3 className="h-5 w-5 text-[#c9a84c]" />
        </PageHeader>

        {showPrefs && (
          <div className="rounded-xl border border-border/40 bg-[#0a0e1a]/80 p-4 flex flex-wrap gap-2">
            {MARKET_TOPIC_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleTopicPref(opt.value)}
                className={`px-3 h-8 rounded-lg text-xs ${
                  topicPrefs.includes(opt.value)
                    ? "bg-[#c9a84c] text-[#0a0e1a]"
                    : "hairline text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <p className="w-full text-[10px] text-muted-foreground mt-1">
              Preferences saved permanently on this device.
            </p>
          </div>
        )}

        <MacroIndicatorsBar indicators={indicators} updatedAt={indicatorsAt} />

        <div className="grid lg:grid-cols-5 gap-6 min-h-[500px]">
          <section className="lg:col-span-3 flex flex-col min-h-[400px] rounded-2xl border border-border/40 bg-[#0a0e1a]/60 p-4">
            <h2 className="font-display text-base mb-4 shrink-0">News Feed</h2>
            <MarketNewsFeed
              news={filteredNews}
              allNews={news}
              configured={newsConfigured}
              filter={newsFilter}
              loading={newsLoading}
              isDemo={isDemo}
              onFilterChange={handleFilterChange}
            />
          </section>

          <section className="lg:col-span-2 space-y-6">
            <IntelligenceBriefCard
              brief={brief}
              news={news}
              refreshing={refreshingBrief}
              isDemo={isDemo}
              onRefresh={handleRefreshBrief}
            />
            <div className="rounded-2xl border border-border/40 bg-[#0a0e1a]/60 p-5 min-h-[200px]">
              <PortfolioRelevancePanel cards={relevance} />
            </div>
          </section>
        </div>
      </div>
    </TierGate>
  );
}
