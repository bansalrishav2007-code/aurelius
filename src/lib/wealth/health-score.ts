import type { MemberWealthProfile } from "./types";

export type HealthScoreResult = {
  score: number;
  band: "needs_attention" | "moderate" | "healthy";
  bandLabel: string;
  bandColor: string;
  downside: string;
  topFix: string;
  breakdown: { label: string; points: number; max: number }[];
};

export function computePortfolioHealthScore(profile: MemberWealthProfile): HealthScoreResult {
  const totalAssets = profile.assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = profile.liabilities.reduce((s, l) => s + l.value, 0);

  const byCategory = new Map<string, number>();
  for (const a of profile.assets) {
    byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + a.value);
  }

  // Diversification (25) — penalise if any single category > 60%
  let diversification = 25;
  if (totalAssets > 0) {
    const maxPct = Math.max(...[...byCategory.values()].map((v) => (v / totalAssets) * 100));
    if (maxPct > 80) diversification = 5;
    else if (maxPct > 60) diversification = 12;
    else if (maxPct > 45) diversification = 18;
  } else {
    diversification = 0;
  }

  // Gold 10-15% target (20)
  const goldPct = totalAssets > 0 ? ((byCategory.get("gold") ?? 0) / totalAssets) * 100 : 0;
  let goldScore = 20;
  if (goldPct < 5 || goldPct > 25) goldScore = 6;
  else if (goldPct < 10 || goldPct > 15) goldScore = 14;

  // Debt ratio < 30% (20)
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  let debtScore = 20;
  if (debtRatio > 50) debtScore = 4;
  else if (debtRatio > 30) debtScore = 10;

  // 80C usage (20) — from tax snapshot if available
  const used80C = profile.taxSnapshot?.used80C ?? 0;
  const limit80C = profile.taxSnapshot?.limit80C ?? 1_50_000;
  const pct80C = limit80C > 0 ? (used80C / limit80C) * 100 : 0;
  let taxScore = 20;
  if (pct80C < 50) taxScore = 6;
  else if (pct80C < 80) taxScore = 12;

  // Legal structure (15)
  const legalScore = profile.legalEntities.length > 0 ? 15 : profile.assets.some((a) => a.category === "legal_entity") ? 10 : 4;

  const score = Math.min(100, diversification + goldScore + debtScore + taxScore + legalScore);
  const band =
    score <= 40 ? "needs_attention" : score <= 70 ? "moderate" : "healthy";
  const bandLabel =
    band === "needs_attention" ? "Needs attention" : band === "moderate" ? "Moderate" : "Healthy";
  const bandColor =
    band === "needs_attention" ? "#EF4444" : band === "moderate" ? "#C9A84C" : "#22C55E";

  const issues: string[] = [];
  if (diversification < 18) issues.push("portfolio concentration");
  if (goldScore < 14) issues.push("gold allocation off target");
  if (debtScore < 14) issues.push("elevated debt-to-asset ratio");
  if (taxScore < 14) issues.push("unused 80C headroom");
  if (legalScore < 12) issues.push("no documented legal structure");

  const downside =
    issues.length > 0
      ? `Score held back by: ${issues.slice(0, 2).join(" and ")}.`
      : "Portfolio fundamentals are well balanced across diversification and structure.";

  let topFix = "Maintain quarterly rebalancing across equity, gold, and cash.";
  if (diversification < 14) topFix = "Reduce single-category concentration — diversify into gold or fixed income.";
  else if (debtScore < 12) topFix = "Prioritise liability reduction or asset growth to bring debt below 30% of assets.";
  else if (taxScore < 12) topFix = "Route ELSS/PPF contributions to fully utilise your ₹1.5L 80C limit.";
  else if (goldScore < 12) topFix = "Target 10–15% gold allocation via SGB or sovereign gold bonds.";

  return {
    score,
    band,
    bandLabel,
    bandColor,
    downside,
    topFix,
    breakdown: [
      { label: "Diversification", points: diversification, max: 25 },
      { label: "Gold allocation", points: goldScore, max: 20 },
      { label: "Debt ratio", points: debtScore, max: 20 },
      { label: "Tax efficiency (80C)", points: taxScore, max: 20 },
      { label: "Legal structure", points: legalScore, max: 15 },
    ],
  };
}
