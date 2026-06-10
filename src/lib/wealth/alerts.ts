import { formatInr } from "./calculations";
import { computePortfolioHealthScore } from "./health-score";
import type { MemberWealthProfile, WealthAlert } from "./types";

export function generateWealthAlerts(profile: MemberWealthProfile): WealthAlert[] {
  const alerts: WealthAlert[] = [];
  const totalAssets = profile.assets.reduce((s, a) => s + a.value, 0);
  const now = Date.now();

  const equity = profile.assets.filter((a) => a.category === "equity").reduce((s, a) => s + a.value, 0);
  if (totalAssets > 0 && equity / totalAssets > 0.7) {
    const pct = Math.round((equity / totalAssets) * 100);
    alerts.push({
      id: "concentration-equity",
      severity: pct >= 85 ? "critical" : "warning",
      message: `Your equity is ${pct}% of portfolio — ${pct >= 85 ? "dangerously" : "highly"} concentrated`,
      createdAt: new Date().toISOString(),
    });
  }

  for (const asset of profile.assets) {
    if (asset.category !== "real_estate") continue;
    const days = (now - new Date(asset.updatedAt).getTime()) / 86_400_000;
    if (days > 30) {
      alerts.push({
        id: `stale-${asset.id}`,
        severity: "warning",
        message: `${asset.name} value not updated in ${Math.floor(days)} days — is it still accurate?`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const used80C = profile.taxSnapshot?.used80C ?? 0;
  const limit80C = profile.taxSnapshot?.limit80C ?? 1_50_000;
  const unused = limit80C - used80C;
  if (unused >= 50_000) {
    alerts.push({
      id: "unused-80c",
      severity: "critical",
      message: `80C limit unused — you can save up to ${formatInr(Math.round(unused * 0.3))} more in taxes`,
      createdAt: new Date().toISOString(),
    });
  }

  const cashFd = profile.assets.filter((a) => a.category === "cash_fd").reduce((s, a) => s + a.value, 0);
  if (totalAssets > 0 && cashFd / totalAssets > 0.2) {
    alerts.push({
      id: "idle-cash",
      severity: "warning",
      message: `You have ${formatInr(cashFd)} in cash/FD — above the 20% prudent threshold`,
      createdAt: new Date().toISOString(),
      meta: { cashAmount: cashFd },
    });
  }

  const health = computePortfolioHealthScore(profile);
  if (health.score >= 71) {
    alerts.push({
      id: "health-improved",
      severity: "success",
      message: `Portfolio health at ${health.score} — good progress`,
      createdAt: new Date().toISOString(),
    });
  }

  const dismissed = profile.dismissedAlerts ?? [];
  const sevenDaysAgo = now - 7 * 86_400_000;

  return alerts
    .filter((a) => {
      const d = dismissed.find((x) => x.alertId === a.id);
      if (!d) return true;
      return new Date(d.dismissedAt).getTime() < sevenDaysAgo;
    })
    .slice(0, 5);
}

export function filterVisibleAlerts(alerts: WealthAlert[], profile: MemberWealthProfile, max = 3): WealthAlert[] {
  const dismissed = new Set(
    (profile.dismissedAlerts ?? [])
      .filter((d) => Date.now() - new Date(d.dismissedAt).getTime() < 7 * 86_400_000)
      .map((d) => d.alertId),
  );
  return alerts.filter((a) => !dismissed.has(a.id)).slice(0, max);
}
