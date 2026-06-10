import { computeWealthSummary } from "@/lib/wealth/calculations";
import { getOrCreateProfile } from "@/lib/wealth/store.server";
import type { MarketNewsItem, RelevanceCard } from "./types";

export async function buildPortfolioRelevance(
  memberEmail: string,
  news: MarketNewsItem[],
): Promise<RelevanceCard[]> {
  const profile = await getOrCreateProfile(memberEmail);
  const summary = computeWealthSummary(profile);

  const hasRealEstate = profile.assets.some((a) => a.category === "real_estate");
  const hasEquity = profile.assets.some((a) => a.category === "equity");
  const tax = profile.taxSnapshot;
  const unused80C = Math.max(0, (tax?.limit80C ?? 1_50_000) - (tax?.used80C ?? 0));
  const has80CHeadroom = unused80C > 25_000;

  const cards: RelevanceCard[] = [];
  const usedHeadlines = new Set<string>();

  function pickNews(
    category: MarketNewsItem["category"],
    fallbackHeadline: string,
    explanation: string,
    assetLabel: string,
  ) {
    const item = news.find((n) => n.category === category && !usedHeadlines.has(n.headline));
    const headline = item?.headline ?? fallbackHeadline;
    usedHeadlines.add(headline);
    return {
      id: `rel-${cards.length + 1}`,
      headline,
      explanation,
      category,
      assetLabel,
    };
  }

  if (hasEquity) {
    cards.push(
      pickNews(
        "Markets",
        "Indian equities hold firm amid global volatility",
        `With ${summary.allocation.find((s) => s.category === "equity")?.percent ?? 0}% of your portfolio in equity, index moves and FII flows directly affect your net worth trajectory.`,
        "📈 Equity",
      ),
    );
  }

  if (hasRealEstate) {
    cards.push(
      pickNews(
        "Real Estate",
        "Residential demand stays resilient in top metros",
        "Your real estate holdings are sensitive to rate cycles and regulatory shifts — monitor RBI signals and stamp-duty changes in key markets.",
        "🏠 Real Estate",
      ),
    );
  }

  if (has80CHeadroom) {
    cards.push(
      pickNews(
        "Tax",
        "Tax-saving window narrows as FY end approaches",
        `You have unused 80C headroom — tax and regulation headlines may highlight last-minute ELSS, PPF, and NPS opportunities before 31 March.`,
        "📋 Tax",
      ),
    );
  }

  const hasGold = profile.assets.some((a) => a.category === "gold");
  if (hasGold) {
    cards.push(
      pickNews(
        "Markets",
        "Gold holds firm amid global uncertainty",
        "Your gold allocation provides a hedge — watch USD/INR and global rates for rebalancing signals.",
        "🪙 Gold",
      ),
    );
  }

  if (cards.length < 2) {
    cards.push(
      pickNews(
        "RBI",
        "RBI holds policy steady; liquidity remains ample",
        "Monetary policy shapes your FD yields, loan costs, and equity valuations — relevant across your full balance sheet.",
        "🏛️ RBI",
      ),
    );
  }

  if (cards.length < 3) {
    cards.push(
      pickNews(
        "Global",
        "Global risk sentiment influences EM fund flows",
        "International developments affect INR, import costs, and offshore allocations — especially for principals with global exposure.",
        "🌍 Global",
      ),
    );
  }

  return cards.slice(0, 3);
}
