import { ensureServerEnv, getServerEnv } from "@/lib/env.server";
import type { MarketNewsItem, NewsCategory, NewsFilterTab } from "./types";

const QUERY =
  "India finance OR stock market OR RBI OR SEBI OR NSE OR BSE OR mutual funds OR real estate India";

const REQUIRED_KEYWORDS =
  /\b(tax|market|rbi|sebi|equity|mutual fund|real estate|gold|legal|finance|investment|budget|income tax|capital gains|nifty|sensex|startup|ipo|fdi)\b/i;

const BLOCKED_KEYWORDS =
  /\b(travel|lifestyle|gadgets?|celebrity|fashion|recipe|sports|entertainment|bollywood|cricket|football|gaming|smartphone|iphone|android phone|laptop review|restaurant|hotel review|vacation|tourism|wellness retreat|fitness trend)\b/i;

export function passesKeywordFilter(headline: string, description = ""): boolean {
  const text = `${headline} ${description}`;
  if (BLOCKED_KEYWORDS.test(text)) return false;
  return REQUIRED_KEYWORDS.test(text);
}

export function getNewsApiKey(): string | undefined {
  ensureServerEnv();
  return (getServerEnv("NEWSAPI_KEY") ?? getServerEnv("NEWS_API_KEY"))?.trim();
}

export function isNewsApiConfigured(): boolean {
  return Boolean(getNewsApiKey());
}

function categorize(headline: string, description = ""): NewsCategory {
  const text = `${headline} ${description}`.toLowerCase();
  if (/\b(real estate|property|housing|reit|rera)\b/.test(text)) return "Real Estate";
  if (/\b(rbi|repo rate|monetary policy|mpc|reserve bank)\b/.test(text)) return "RBI";
  if (/\b(tax|gst|itr|sebi|regulation|compliance|budget)\b/.test(text)) return "Tax";
  if (/\b(us |fed |china|europe|global|oil|crude|dollar)\b/.test(text) && !/\bindia\b/.test(text)) {
    return "Global";
  }
  return "Markets";
}

function matchesFilter(category: NewsCategory, tab: NewsFilterTab): boolean {
  if (tab === "All") return true;
  if (tab === "Markets") return category === "Markets";
  if (tab === "Real Estate") return category === "Real Estate";
  if (tab === "Tax & Regulation") return category === "Tax" || category === "RBI";
  if (tab === "Global") return category === "Global";
  return true;
}

export async function fetchMarketNews(filter: NewsFilterTab = "All"): Promise<{
  items: MarketNewsItem[];
  configured: boolean;
}> {
  const apiKey = getNewsApiKey();
  if (!apiKey) {
    return { items: getPlaceholderNews(), configured: false };
  }

  try {
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", QUERY);
    url.searchParams.set("language", "en");
    url.searchParams.set("sortBy", "publishedAt");
    url.searchParams.set("pageSize", "40");

    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      console.error("[Market Intel] NewsAPI error:", res.status, await res.text().catch(() => ""));
      return { items: getPlaceholderNews(), configured: true };
    }

    const data = (await res.json()) as {
      articles?: Array<{
        title?: string;
        source?: { name?: string };
        publishedAt?: string;
        url?: string;
        description?: string;
      }>;
    };

    const items: MarketNewsItem[] = (data.articles ?? [])
      .filter((a) => a.title && a.url)
      .filter((a) => passesKeywordFilter(a.title!, a.description ?? ""))
      .map((a, i) => {
        const headline = a.title!.trim();
        const category = categorize(headline, a.description ?? "");
        return {
          id: `news-${i}-${a.publishedAt ?? i}`,
          headline,
          source: a.source?.name ?? "News",
          publishedAt: a.publishedAt ?? new Date().toISOString(),
          url: a.url!,
          category,
          description: a.description?.trim(),
        };
      })
      .filter((item) => matchesFilter(item.category, filter));

    return { items, configured: true };
  } catch (err) {
    console.error("[Market Intel] News fetch failed:", err);
    return { items: getPlaceholderNews(), configured: true };
  }
}

function getPlaceholderNews(): MarketNewsItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: "placeholder-1",
      headline: "Configure NewsAPI key to enable live feed",
      source: "Aurelius",
      publishedAt: now,
      url: "#",
      category: "Markets",
      description: "Add NEWSAPI_KEY or NEWS_API_KEY to your .env file.",
    },
  ];
}
