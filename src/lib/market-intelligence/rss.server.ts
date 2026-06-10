import type { MarketArticle } from "./types";

const ET_MARKETS_RSS_URLS = [
  "https://economictimes.indiatimes.com/markets/rss.cms",
  "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
  "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
];

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; AureliusPrivateOffice/1.0; +https://aurelius.ai)",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractTag(block: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i").exec(block);
  if (cdata?.[1]) return cdata[1].trim();

  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
  return plain?.[1]?.trim() ?? "";
}

function inferSource(link: string, title: string): string {
  const host = link.toLowerCase();
  if (host.includes("livemint.com") || title.toLowerCase().includes("mint")) return "MINT";
  if (host.includes("financialexpress.com")) return "FINANCIAL EXPRESS";
  if (host.includes("moneycontrol.com")) return "MONEYCONTROL";
  return "ECONOMIC TIMES";
}

function parseRssXml(xml: string, limit = 9): MarketArticle[] {
  const articles: MarketArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && articles.length < limit) {
    const block = match[1];
    const headline = stripHtml(extractTag(block, "title"));
    const rawDescription = extractTag(block, "description");
    const link = extractTag(block, "link").trim();
    const pubDate = extractTag(block, "pubDate").trim();

    if (!headline || !link) continue;

    const summary = stripHtml(rawDescription);
    const oneLine =
      summary.length > 160 ? `${summary.slice(0, 157).trim()}…` : summary || "Markets desk briefing — read full coverage.";

    articles.push({
      id: link,
      source: inferSource(link, headline),
      headline,
      summary: oneLine,
      url: link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    });
  }

  return articles;
}

const FALLBACK_ARTICLES: MarketArticle[] = [
  {
    id: "fallback-1",
    source: "ECONOMIC TIMES",
    headline: "FIIs turn cautious on India equities amid global rate uncertainty",
    summary: "Foreign portfolio investors trimmed exposure across financials and IT as treasury yields firm overseas.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 8 * 60_000).toISOString(),
  },
  {
    id: "fallback-2",
    source: "MINT",
    headline: "RBI holds repo rate steady; liquidity stance remains accommodative",
    summary: "Policy committee signals vigilance on inflation while supporting orderly market conditions.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 22 * 60_000).toISOString(),
  },
  {
    id: "fallback-3",
    source: "FINANCIAL EXPRESS",
    headline: "Promoter holding disclosures rise after latest SEBI circular",
    summary: "Listed entities accelerate compliance filings as disclosure windows narrow for key shareholders.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 41 * 60_000).toISOString(),
  },
  {
    id: "fallback-4",
    source: "ECONOMIC TIMES",
    headline: "Mid-cap valuations compress as earnings breadth improves",
    summary: "Active managers rotate toward industrials and financials as small-cap premium moderates.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 55 * 60_000).toISOString(),
  },
  {
    id: "fallback-5",
    source: "ECONOMIC TIMES",
    headline: "Gold holds firm as rupee volatility keeps hedging demand elevated",
    summary: "Family offices increase bullion allocation alongside dollar-hedge instruments.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 72 * 60_000).toISOString(),
  },
  {
    id: "fallback-6",
    source: "MINT",
    headline: "Q4 earnings: Nifty constituents report margin resilience",
    summary: "Aggregate profit growth beats estimates led by banks, autos, and capital goods.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 95 * 60_000).toISOString(),
  },
  {
    id: "fallback-7",
    source: "ECONOMIC TIMES",
    headline: "Bond market steady as states front-load borrowing calendar",
    summary: "Yield curve flattens modestly with strong institutional participation at primary auctions.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 110 * 60_000).toISOString(),
  },
  {
    id: "fallback-8",
    source: "FINANCIAL EXPRESS",
    headline: "IPO pipeline thickens for consumer and infrastructure names",
    summary: "Merchant bankers report robust anchor demand from domestic institutions.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 128 * 60_000).toISOString(),
  },
  {
    id: "fallback-9",
    source: "ECONOMIC TIMES",
    headline: "Rupee trades in narrow band ahead of US payrolls data",
    summary: "Exporters step up forward cover as importers delay dollar purchases.",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 145 * 60_000).toISOString(),
  },
];

async function fetchRssXml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!/<rss|<feed|<item>/i.test(text)) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchMarketArticles(limit = 9): Promise<{ articles: MarketArticle[]; live: boolean }> {
  for (const url of ET_MARKETS_RSS_URLS) {
    const xml = await fetchRssXml(url);
    if (!xml) continue;

    const articles = parseRssXml(xml, limit);
    if (articles.length >= 3) {
      console.info("[Aurelius] Market RSS loaded", { url, count: articles.length });
      return { articles: articles.slice(0, limit), live: true };
    }
  }

  console.warn("[Aurelius] Market RSS unavailable — serving curated fallback headlines");
  return { articles: FALLBACK_ARTICLES.slice(0, limit), live: false };
}
