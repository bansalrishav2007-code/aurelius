export type MarketTickerDirection = "up" | "down" | "flat" | "unavailable";

export type MarketTickerItem = {
  symbol: string;
  value: string | null;
  changeAmount: string | null;
  change: string | null;
  direction: MarketTickerDirection;
  unavailable?: boolean;
};

export type NewsCategory = "tax" | "sebi" | "fema" | "market" | "rbi";

export type NewsCategoryMeta = {
  label: string;
  filterKey: "tax" | "legal" | "markets" | "rbi_sebi";
  tone: "tax" | "sebi" | "fema" | "market" | "rbi";
};

export type MarketArticle = {
  id: string;
  source: string;
  headline: string;
  summary: string;
  url: string;
  publishedAt: string;
  category: NewsCategory;
};

export type MarketSessionState = {
  status: "live" | "closed" | "weekend";
  label: string;
  detail?: string;
};

export type MarketIntelligencePayload = {
  ticker: MarketTickerItem[];
  fetchedAt: string;
  liveIndices: boolean;
  marketSession: MarketSessionState;
  source?: "cache";
};

export type NewsPayload = {
  articles: MarketArticle[];
  fetchedAt: string;
  source: "live" | "cache" | "fallback";
  reason?: string;
};
