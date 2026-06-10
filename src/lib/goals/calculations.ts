import { normalizeGoalCategory } from "./categories";
import type { EnrichedGoal, GoalTrackStatus, MemberGoal } from "./types";

export function enrichGoal(goal: MemberGoal, now = new Date()): EnrichedGoal {
  const target = goal.targetAmount ?? 0;
  const current = goal.currentAmount ?? 0;
  const progressPercent =
    goal.status === "completed" || (target > 0 && current >= target)
      ? 100
      : target > 0
        ? Math.min(100, Math.round((current / target) * 100))
        : 0;
  const gapAmount = Math.max(0, target - current);

  let monthsRemaining: number | null = null;
  let monthlySavingNeeded: number | null = null;

  if (goal.targetDate && target > 0) {
    const end = new Date(goal.targetDate);
    const diffMs = end.getTime() - now.getTime();
    monthsRemaining = Math.max(0, Math.ceil(diffMs / (30 * 86_400_000)));
    if (gapAmount <= 0) {
      monthlySavingNeeded = 0;
    } else if (monthsRemaining > 0) {
      monthlySavingNeeded = Math.ceil(gapAmount / monthsRemaining);
    } else {
      monthlySavingNeeded = gapAmount;
    }
  }

  const trackStatus = computeTrackStatus(goal, progressPercent, gapAmount, now);

  return {
    ...goal,
    category: normalizeGoalCategory(goal.category),
    progressPercent,
    gapAmount,
    monthlySavingNeeded,
    monthsRemaining,
    trackStatus,
    isOverdue: isGoalOverdue(goal, now),
  };
}

function isGoalOverdue(goal: MemberGoal, now: Date): boolean {
  if (goal.status === "completed") return false;
  if (!goal.targetDate) return false;
  return now.getTime() > new Date(goal.targetDate).getTime();
}

function computeTrackStatus(
  goal: MemberGoal,
  progressPercent: number,
  gapAmount: number,
  now: Date,
): GoalTrackStatus {
  const target = goal.targetAmount ?? 0;
  const current = goal.currentAmount ?? 0;

  if (goal.status === "completed" || (target > 0 && current >= target) || progressPercent >= 100) {
    return "achieved";
  }

  if (goal.targetDate) {
    const end = new Date(goal.targetDate);
    const nowMs = now.getTime();
    const daysLeft = (end.getTime() - nowMs) / 86_400_000;

    if (nowMs >= end.getTime() && gapAmount > 0) return "at_risk";

    if (daysLeft <= 30 && progressPercent < 30) return "at_risk";
  }

  if (goal.targetDate) {
    const end = new Date(goal.targetDate);
    if (now.getTime() < end.getTime() && progressPercent > 50) return "on_track";
  }

  if (!goal.targetDate) return progressPercent >= 50 ? "on_track" : "at_risk";

  return "at_risk";
}

export function suggestGoalAction(goal: MemberGoal, netWorth = 0): string {
  const gap = Math.max(0, (goal.targetAmount ?? 0) - (goal.currentAmount ?? 0));
  if (gap <= 0) return "Goal funded — consider moving surplus to liquid FD or equity SIP for growth.";

  const category = goal.category?.toLowerCase() ?? goal.title.toLowerCase();
  if (category.includes("retire")) {
    return "Grow equity and NPS/PPF allocations; avoid liquidating core property holdings before retirement date.";
  }
  if (category.includes("property") || category.includes("real estate") || category.includes("home")) {
    return "Consider partial liquidation of overweight equity or idle FD balances to accelerate the property corpus.";
  }
  if (category.includes("education")) {
    return "Balance equity SIPs with debt funds as the target date approaches to protect the education corpus.";
  }
  if (netWorth > gap * 3) {
    return "You may reallocate 10–15% from cash/FD into goal-specific liquid funds without impacting emergency reserves.";
  }
  return "Increase monthly SIP into diversified equity or gold ETF to close the gap while preserving tax efficiency.";
}

export function summarizeGoals(goals: EnrichedGoal[]) {
  const active = goals.filter((g) => g.status === "active");
  return {
    total: goals.length,
    onTrack: active.filter((g) => g.trackStatus === "on_track").length,
    atRisk: active.filter((g) => g.trackStatus === "at_risk").length,
    achieved: goals.filter((g) => g.trackStatus === "achieved" || g.status === "completed").length,
  };
}
