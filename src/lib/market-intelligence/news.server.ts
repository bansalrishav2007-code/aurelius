import { getServerEnv } from "@/lib/env.server";
import { categorizeNews, isWealthRelevantNews } from "./news-categories";
import type { MarketArticle } from "./types";

const NEWS_QUERY =
  "(SEBI OR RBI OR NSE OR BSE OR NIFTY OR SENSEX OR \"income tax\" OR GST OR FEMA OR \"capital gains\" OR \"mutual fund\" OR forex OR rupee OR IPO OR bond market) AND India";

const SOURCE_ALIASES: Record<string, string> = {
  "the economic times": "ECONOMIC TIMES",
  "economic times": "ECONOMIC TIMES",
  "livemint": "MINT",
  mint: "MINT",
  "financial express": "FINANCIAL EXPRESS",
  "the financial express": "FINANCIAL EXPRESS",
  moneycontrol: "MONEYCONTROL",
  "business standard": "BUSINESS STANDARD",
  ndtv: "NDTV",
  reuters: "REUTERS",
  bloomberg: "BLOOMBERG",
};

function normalizeSource(name: string): string {
  const key = name.trim().toLowerCase();
  return SOURCE_ALIASES[key] ?? name.trim().toUpperCase();
}

function oneLineSummary(text: string | null | undefined): string {
  const cleaned = (text ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Markets desk briefing — read full coverage.";
  return cleaned.length > 160 ? `${cleaned.slice(0, 157).trim()}…` : cleaned;
}

function toMarketArticle(
  input: Omit<MarketArticle, "category"> & { category?: MarketArticle["category"] },
): MarketArticle {
  const summary = input.summary;
  return {
    ...input,
    category: input.category ?? categorizeNews(input.headline, summary),
  };
}

const FALLBACK_ARTICLES: MarketArticle[] = [
  toMarketArticle({
    id: "fallback-1",
    source: "ECONOMIC TIMES",
    headline: "FIIs turn cautious on India equities amid global rate uncertainty",
    summary: "Foreign portfolio investors trimmed exposure across financials and IT as treasury yields firm overseas.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    category: "market",
  }),
  toMarketArticle({
    id: "fallback-2",
    source: "MINT",
    headline: "RBI holds repo rate steady; liquidity stance remains accommodative",
    summary: "Policy committee signals vigilance on inflation while supporting orderly market conditions.",
    url: "https://www.livemint.com/market",
    publishedAt: new Date(Date.now() - 22 * 60_000).toISOString(),
    category: "rbi",
  }),
  toMarketArticle({
    id: "fallback-3",
    source: "FINANCIAL EXPRESS",
    headline: "Promoter holding disclosures rise after latest SEBI circular",
    summary: "Listed entities accelerate compliance filings as disclosure windows narrow for key shareholders.",
    url: "https://www.financialexpress.com/market/",
    publishedAt: new Date(Date.now() - 41 * 60_000).toISOString(),
    category: "sebi",
  }),
  toMarketArticle({
    id: "fallback-4",
    source: "ECONOMIC TIMES",
    headline: "Mid-cap valuations compress as earnings breadth improves",
    summary: "Active managers rotate toward industrials and financials as small-cap premium moderates.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 55 * 60_000).toISOString(),
    category: "market",
  }),
  toMarketArticle({
    id: "fallback-5",
    source: "ECONOMIC TIMES",
    headline: "Gold holds firm as rupee volatility keeps hedging demand elevated",
    summary: "Family offices increase bullion allocation alongside dollar-hedge instruments.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 72 * 60_000).toISOString(),
    category: "market",
  }),
  toMarketArticle({
    id: "fallback-6",
    source: "MINT",
    headline: "Q4 earnings: Nifty constituents report margin resilience",
    summary: "Aggregate profit growth beats estimates led by banks, autos, and capital goods.",
    url: "https://www.livemint.com/market",
    publishedAt: new Date(Date.now() - 95 * 60_000).toISOString(),
    category: "market",
  }),
  toMarketArticle({
    id: "fallback-7",
    source: "ECONOMIC TIMES",
    headline: "Bond market steady as states front-load borrowing calendar",
    summary: "Yield curve flattens modestly with strong institutional participation at primary auctions.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 110 * 60_000).toISOString(),
    category: "market",
  }),
  toMarketArticle({
    id: "fallback-8",
    source: "FINANCIAL EXPRESS",
    headline: "IPO pipeline thickens for consumer and infrastructure names",
    summary: "Merchant bankers report robust anchor demand from domestic institutions.",
    url: "https://www.financialexpress.com/market/",
    publishedAt: new Date(Date.now() - 128 * 60_000).toISOString(),
    category: "market",
  }),
  toMarketArticle({
    id: "fallback-9",
    source: "ECONOMIC TIMES",
    headline: "Rupee trades in narrow band ahead of US payrolls data",
    summary: "Exporters step up forward cover as importers delay dollar purchases.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 145 * 60_000).toISOString(),
    category: "market",
  }),
  toMarketArticle({
    id: "fallback-10",
    source: "MINT",
    headline: "SEBI tightens disclosure norms for related-party transactions",
    summary: "Listed firms face stricter timelines for board approvals and shareholder intimation.",
    url: "https://www.livemint.com/market",
    publishedAt: new Date(Date.now() - 162 * 60_000).toISOString(),
    category: "sebi",
  }),
  toMarketArticle({
    id: "fallback-11",
    source: "FINANCIAL EXPRESS",
    headline: "Mutual fund inflows hit record as retail SIP momentum builds",
    summary: "Equity schemes attract sustained subscriptions across tier-II and tier-III cities.",
    url: "https://www.financialexpress.com/market/",
    publishedAt: new Date(Date.now() - 178 * 60_000).toISOString(),
    category: "market",
  }),
  toMarketArticle({
    id: "fallback-12",
    source: "ECONOMIC TIMES",
    headline: "NSE volumes rise as derivatives participation broadens",
    summary: "Institutional and proprietary desks increase activity in index options.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 195 * 60_000).toISOString(),
    category: "market",
  }),
];

type NewsApiArticle = {
  source?: { id?: string | null; name?: string | null };
  title?: string | null;
  description?: string | null;
  url?: string | null;
  publishedAt?: string | null;
};

export async function fetchNewsArticles(
  limit = 12,
  apiKeyOverride?: string,
): Promise<{
  articles: MarketArticle[];
  live: boolean;
  reason?: string;
}> {
  const apiKey = apiKeyOverride?.trim() || getServerEnv("NEWS_API_KEY");

  if (!apiKey || apiKey === "your_key_here") {
    console.warn("[Aurelius] NEWS_API_KEY not configured — serving fallback headlines");
    return {
      articles: FALLBACK_ARTICLES.slice(0, limit),
      live: false,
      reason: "NEWS_API_KEY not configured",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const fetchSize = String(Math.max(limit * 4, 40));
    const businessParams = new URLSearchParams({
      country: "in",
      category: "business",
      pageSize: fetchSize,
      apiKey,
    });

    let rawArticles: NewsApiArticle[] = [];
    const businessRes = await fetch(`https://newsapi.org/v2/top-headlines?${businessParams.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const businessBody = (await businessRes.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
      articles?: NewsApiArticle[];
    };

    if (businessRes.ok && businessBody.status !== "error") {
      rawArticles = businessBody.articles ?? [];
    }

    if (rawArticles.length < limit) {
      const everythingParams = new URLSearchParams({
        q: NEWS_QUERY,
        language: "en",
        sortBy: "publishedAt",
        pageSize: fetchSize,
        apiKey,
      });
      const everythingRes = await fetch(`https://newsapi.org/v2/everything?${everythingParams.toString()}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      const everythingBody = (await everythingRes.json().catch(() => ({}))) as {
        status?: string;
        message?: string;
        articles?: NewsApiArticle[];
      };

      if (everythingRes.ok && everythingBody.status !== "error") {
        const seen = new Set(rawArticles.map((a) => a.url));
        for (const article of everythingBody.articles ?? []) {
          if (article.url && !seen.has(article.url)) {
            rawArticles.push(article);
            seen.add(article.url);
          }
        }
      }
    }

    if (rawArticles.length === 0) {
      console.error("[Aurelius] NewsAPI returned no articles");
      return {
        articles: FALLBACK_ARTICLES.slice(0, limit),
        live: false,
        reason: "No articles from NewsAPI",
      };
    }

    const articles = rawArticles
      .filter((a) => a.title?.trim() && a.url?.trim())
      .map((a) => {
        const headline = a.title!.trim();
        const summary = oneLineSummary(a.description);
        return toMarketArticle({
          id: a.url!.trim(),
          source: normalizeSource(a.source?.name ?? "Markets"),
          headline,
          summary,
          url: a.url!.trim(),
          publishedAt: a.publishedAt ? new Date(a.publishedAt).toISOString() : new Date().toISOString(),
          category: categorizeNews(headline, summary),
        });
      })
      .filter((a) => isWealthRelevantNews(a.headline, a.summary))
      .slice(0, limit);

    if (articles.length < 3) {
      console.warn("[Aurelius] NewsAPI returned insufficient articles", { count: articles.length });
      return { articles: FALLBACK_ARTICLES.slice(0, limit), live: false, reason: "Insufficient articles" };
    }

    console.info("[Aurelius] NewsAPI loaded", { count: articles.length });
    return { articles, live: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "NewsAPI fetch failed";
    console.error("[Aurelius] NewsAPI exception", { message });
    return { articles: FALLBACK_ARTICLES.slice(0, limit), live: false, reason: message };
  } finally {
    clearTimeout(timeout);
  }
}
