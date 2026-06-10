import type { NewsCategory, NewsCategoryMeta } from "./types";

export const NEWS_CATEGORY_META: Record<NewsCategory, NewsCategoryMeta> = {
  tax: { label: "Tax Alert", filterKey: "tax", tone: "tax" },
  sebi: { label: "SEBI Update", filterKey: "rbi_sebi", tone: "sebi" },
  fema: { label: "FEMA", filterKey: "legal", tone: "fema" },
  market: { label: "Market Move", filterKey: "markets", tone: "market" },
  rbi: { label: "RBI Policy", filterKey: "rbi_sebi", tone: "rbi" },
};

export const NEWS_FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "tax", label: "Tax" },
  { id: "legal", label: "Legal" },
  { id: "markets", label: "Markets" },
  { id: "rbi_sebi", label: "RBI/SEBI" },
] as const;

export type NewsFilterId = (typeof NEWS_FILTER_OPTIONS)[number]["id"];

const POLITICAL_OR_NOISE = [
  /\belection\b/i,
  /\bmodi\b/i,
  /\bamit shah\b/i,
  /\bbjp\b/i,
  /\bcongress\b/i,
  /\baap\b/i,
  /\bparliament debate\b/i,
  /\blok sabha\b/i,
  /\brajya sabha\b/i,
  /\bpolitic/i,
  /\bprotest\b/i,
  /\briot\b/i,
  /\bmurder\b/i,
  /\bcrime\b/i,
  /\bbollywood\b/i,
  /\bentertainment\b/i,
  /\bcelebrity\b/i,
  /\bcricket\b/i,
  /\bipl\b/i,
  /\bfootball\b/i,
  /\bolympic/i,
  /\bweather\b/i,
  /\bearthquake\b/i,
];

const GADGET_LIFESTYLE_NOISE = [
  /\bsamsung\b/i,
  /\bgalaxy\s*(s|z|a|m|f|note|tab|watch|buds|ring)\b/i,
  /\biphone\b/i,
  /\bipad\b/i,
  /\bmacbook\b/i,
  /\bapple watch\b/i,
  /\boneplus\b/i,
  /\bxiaomi\b/i,
  /\bredmi\b/i,
  /\brealme\b/i,
  /\boppo\b/i,
  /\bvivo\b/i,
  /\bpixel\s*\d/i,
  /\bsmartphone\b/i,
  /\bgadget\b/i,
  /\blaptop\b/i,
  /\bplaystation\b/i,
  /\bxbox\b/i,
  /\bnintendo\b/i,
  /\bgaming\b/i,
  /\blifestyle\b/i,
  /\bfashion\b/i,
  /\brecipe\b/i,
  /\brestaurant\b/i,
  /\btravel\b/i,
  /\bhotel\b/i,
  /\bbeauty\b/i,
  /\bfitness\b/i,
  /\bviral\b/i,
  /\btiktok\b/i,
  /\binstagram\b/i,
  /\breview:\s*/i,
  /\bunboxing\b/i,
  /\bspecs\b/i,
  /\bdisplay\b/i,
  /\bcamera\s*mp\b/i,
  /\bbattery\s*mah\b/i,
];

const FINANCIAL_SIGNAL = [
  /\bsebi\b/i,
  /\brbi\b/i,
  /\btax\b/i,
  /\bgst\b/i,
  /\bfema\b/i,
  /\bmarket\b/i,
  /\bstock\b/i,
  /\bnifty\b/i,
  /\bsensex\b/i,
  /\bbse\b/i,
  /\bnse\b/i,
  /\bmutual fund/i,
  /\bcapital gain/i,
  /\bincome tax/i,
  /\bwealth\b/i,
  /\binvest/i,
  /\bbond\b/i,
  /\bipo\b/i,
  /\bforex\b/i,
  /\brupee\b/i,
  /\bgold\b/i,
  /\bcompliance\b/i,
  /\bregulat/i,
  /\bportfolio\b/i,
  /\bdividend\b/i,
  /\bearning/i,
  /\bfinance\b/i,
  /\bbank\b/i,
  /\brepo rate\b/i,
  /\bmonetary policy\b/i,
  /\btransfer pricing\b/i,
  /\bestate\b/i,
  /\btrust\b/i,
];

function combinedText(headline: string, summary: string): string {
  return `${headline} ${summary}`.toLowerCase();
}

export function isWealthRelevantNews(headline: string, summary = ""): boolean {
  const text = combinedText(headline, summary);
  if (POLITICAL_OR_NOISE.some((pattern) => pattern.test(text))) return false;
  if (GADGET_LIFESTYLE_NOISE.some((pattern) => pattern.test(text))) return false;
  return FINANCIAL_SIGNAL.some((pattern) => pattern.test(text));
}

export function categorizeNews(headline: string, summary = ""): NewsCategory {
  const text = combinedText(headline, summary);

  if (/\bfema\b|foreign exchange|overseas direct|cross-border|remittance|lrs\b/i.test(text)) {
    return "fema";
  }
  if (/\bsebi\b|insider trading|disclosure norm|listed compan|promoter holding|takeover code/i.test(text)) {
    return "sebi";
  }
  if (/\brbi\b|repo rate|monetary policy|liquidity|mpc\b|policy rate|crr\b|slr\b/i.test(text)) {
    return "rbi";
  }
  if (/\btax\b|gst\b|income tax|capital gain|itr\b|advance tax|tds\b|direct tax/i.test(text)) {
    return "tax";
  }

  return "market";
}

export function articleMatchesFilter(category: NewsCategory, filter: NewsFilterId): boolean {
  if (filter === "all") return true;
  return NEWS_CATEGORY_META[category].filterKey === filter;
}
