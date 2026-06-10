export type NewsCategory = "Markets" | "Real Estate" | "Tax" | "RBI" | "Global";

export type NewsFilterTab = "All" | "Markets" | "Real Estate" | "Tax & Regulation" | "Global";

export type MarketNewsItem = {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
  category: NewsCategory;
  description?: string;
};

export type MacroIndicator = {
  id: string;
  label: string;
  value: string;
  changePercent: number | null;
  changeLabel?: string;
  isLive: boolean;
  trend7d?: number[];
};

export type MarketBrief = {
  content: string;
  generatedAt: string;
  sourceHeadlines?: { headline: string; url: string }[];
};

export type RelevanceCard = {
  id: string;
  headline: string;
  explanation: string;
  category: NewsCategory;
  assetLabel?: string;
};

export type MarketTopicPreference =
  | "real_estate"
  | "equity"
  | "tax"
  | "gold"
  | "legal"
  | "rbi_sebi"
  | "global";

export const MARKET_TOPIC_OPTIONS: { value: MarketTopicPreference; label: string }[] = [
  { value: "real_estate", label: "Real Estate" },
  { value: "equity", label: "Equity" },
  { value: "tax", label: "Tax" },
  { value: "gold", label: "Gold" },
  { value: "legal", label: "Legal" },
  { value: "rbi_sebi", label: "RBI/SEBI" },
  { value: "global", label: "Global Markets" },
];
