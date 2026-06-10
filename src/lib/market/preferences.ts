import type { MarketTopicPreference } from "./types";

const KEY = "aurelius-market-topic-prefs";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadMarketTopicPrefs(): MarketTopicPreference[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MarketTopicPreference[];
  } catch {
    return [];
  }
}

export function saveMarketTopicPrefs(prefs: MarketTopicPreference[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function articleMatchesPrefs(
  headline: string,
  description: string,
  category: string,
  prefs: MarketTopicPreference[],
): boolean {
  if (prefs.length === 0) return true;
  const text = `${headline} ${description} ${category}`.toLowerCase();
  return prefs.some((p) => {
    if (p === "real_estate") return /\b(real estate|property|housing|rera)\b/.test(text);
    if (p === "equity") return /\b(equity|nifty|sensex|stock|mf|mutual)\b/.test(text);
    if (p === "tax") return /\b(tax|itr|gst|budget|80c|capital gains)\b/.test(text);
    if (p === "gold") return /\b(gold|silver|bullion|sgb)\b/.test(text);
    if (p === "legal") return /\b(legal|sebi|compliance|court|regulation)\b/.test(text);
    if (p === "rbi_sebi") return /\b(rbi|sebi|repo|mpc|monetary)\b/.test(text);
    if (p === "global") return /\b(global|us |fed |china|europe|fdi|ipo)\b/.test(text);
    return false;
  });
}
