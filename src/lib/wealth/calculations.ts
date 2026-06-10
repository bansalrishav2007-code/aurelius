import { filterVisibleAlerts, generateWealthAlerts } from "./alerts";
import { ASSET_CATEGORY_META } from "./categories";
import { EMPTY_DONUT_COLOR } from "./colors";
import { computePortfolioHealthScore } from "./health-score";
import type {
  AssetCategory,
  MemberWealthProfile,
  PortfolioSnapshot,
  WealthAllocationSlice,
  WealthOverviewSummary,
} from "./types";

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function computeWealthSummary(profile: MemberWealthProfile): WealthOverviewSummary {
  const totalAssets = profile.assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = profile.liabilities.reduce((sum, l) => sum + (l.value ?? 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  const byCategory = new Map<AssetCategory, number>();
  for (const asset of profile.assets) {
    byCategory.set(asset.category, (byCategory.get(asset.category) ?? 0) + asset.value);
  }

  const allocation: WealthAllocationSlice[] = [...byCategory.entries()]
    .map(([category, value]) => ({
      name: ASSET_CATEGORY_META[category].label,
      category,
      value,
      percent: totalAssets > 0 ? Math.round((value / totalAssets) * 100) : 0,
      color: ASSET_CATEGORY_META[category].color,
    }))
    .sort((a, b) => b.value - a.value);

  const monthOverMonth = computeMonthOverMonth(netWorth, profile.netWorthSnapshots);
  const health = computePortfolioHealthScore(profile);
  const allAlerts = generateWealthAlerts(profile);

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    allocation,
    profile,
    monthOverMonth,
    healthScore: {
      score: health.score,
      band: health.band,
      bandLabel: health.bandLabel,
      bandColor: health.bandColor,
      downside: health.downside,
      topFix: health.topFix,
      breakdown: health.breakdown,
    },
    alerts: filterVisibleAlerts(allAlerts, profile, 3),
  };
}

export function recordPortfolioSnapshot(
  profile: MemberWealthProfile,
  netWorth: number,
  totalAssets: number,
  totalLiabilities: number,
): PortfolioSnapshot[] {
  const snapshots = [...(profile.portfolioSnapshots ?? [])];
  const entry: PortfolioSnapshot = {
    at: new Date().toISOString(),
    netWorth,
    totalAssets,
    totalLiabilities,
  };
  const last = snapshots[snapshots.length - 1];
  if (last && last.netWorth === netWorth && last.totalAssets === totalAssets && last.totalLiabilities === totalLiabilities) {
    return snapshots;
  }
  snapshots.push(entry);
  return snapshots.slice(-120);
}

export function filterSnapshotsByRange(
  snapshots: PortfolioSnapshot[],
  range: "3m" | "6m" | "1y" | "all",
): PortfolioSnapshot[] {
  if (range === "all" || snapshots.length === 0) return snapshots;
  const months = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const cutoff = Date.now() - months * 30 * 86_400_000;
  return snapshots.filter((s) => new Date(s.at).getTime() >= cutoff);
}

export function assetValueChange(asset: import("./types").WealthAsset): {
  change: number;
  changePercent: number | null;
  direction: "up" | "down" | "flat";
  hasUpdate: boolean;
} {
  const history = asset.valueHistory ?? [];
  const original = asset.originalValue ?? history[0]?.value ?? asset.value;
  const change = asset.value - original;
  const changePercent =
    original !== 0 ? Math.round((change / Math.abs(original)) * 1000) / 10 : 0;
  return {
    change,
    changePercent,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    hasUpdate: true,
  };
}

export function liabilityTotals(liability: import("./types").WealthLiability) {
  const original = liability.originalValue ?? liability.value;
  const outstanding = liability.value ?? 0;
  const paymentsTotal = (liability.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const paid =
    paymentsTotal > 0
      ? Math.min(original, paymentsTotal)
      : Math.max(0, original - outstanding);
  const percent = original > 0 ? Math.min(100, Math.round((paid / original) * 100)) : 0;
  return { original, outstanding, paid, percent };
}

export function liabilityAmountMissing(liability: import("./types").WealthLiability): boolean {
  return (
    liability.originalValue == null &&
    liability.value === 0 &&
    (liability.payments?.length ?? 0) === 0
  );
}

export type DebtOverviewStatus = "healthy" | "moderate" | "high";

export function computeDebtOverview(totalAssets: number, totalLiabilities: number) {
  const ratio = totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 1000) / 10 : 0;
  let status: DebtOverviewStatus = "healthy";
  let statusLabel = "Healthy";
  let statusColor = "#22C55E";

  if (ratio > 50) {
    status = "high";
    statusLabel = "High";
    statusColor = "#EF4444";
  } else if (ratio >= 30) {
    status = "moderate";
    statusLabel = "Moderate";
    statusColor = "#C9A84C";
  }

  let tip: string;
  if (status === "healthy") {
    tip = `Your debt ratio is ${ratio}% — well within healthy limits. Your net worth growth is unimpeded.`;
  } else if (status === "moderate") {
    tip = `Your debt ratio is ${ratio}% — moderate. Consider accelerating repayments or growing assets to stay below 30%.`;
  } else {
    tip = `Your debt ratio is ${ratio}% — elevated. Prioritise liability reduction to protect net worth growth.`;
  }

  return { totalDebt: totalLiabilities, ratio, status, statusLabel, statusColor, tip };
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function recordNetWorthSnapshot(
  profile: import("./types").MemberWealthProfile,
  netWorth: number,
): import("./types").NetWorthSnapshot[] {
  const month = currentMonthKey();
  const snapshots = [...(profile.netWorthSnapshots ?? [])];
  const idx = snapshots.findIndex((s) => s.month === month);
  if (idx >= 0) snapshots[idx] = { month, netWorth };
  else snapshots.push({ month, netWorth });
  return snapshots.slice(-24);
}

function computeMonthOverMonth(
  netWorth: number,
  snapshots?: import("./types").NetWorthSnapshot[],
): WealthOverviewSummary["monthOverMonth"] {
  if (!snapshots?.length) return undefined;
  const prev = snapshots.find((s) => s.month === previousMonthKey());
  if (!prev) return undefined;
  const change = netWorth - prev.netWorth;
  const changePercent = prev.netWorth !== 0 ? Math.round((change / Math.abs(prev.netWorth)) * 100) : 0;
  return {
    change,
    changePercent,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
  };
}

export function toDonutData(allocation: WealthAllocationSlice[]) {
  if (allocation.length === 0) {
    return [{ name: "No assets yet", value: 100, color: EMPTY_DONUT_COLOR }];
  }
  return allocation.map((slice) => ({
    name: slice.name,
    value: slice.percent,
    color: slice.color,
  }));
}
