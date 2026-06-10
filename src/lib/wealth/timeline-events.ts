import { formatInr } from "./calculations";
import type { CrossedMilestone, MemberWealthProfile, WealthTimelineEvent } from "./types";

const MILESTONES = [
  10_00_000,
  25_00_000,
  50_00_000,
  1_00_00_000,
  5_00_00_000,
  10_00_00_000,
  25_00_00_000,
  50_00_00_000,
  100_00_00_000,
];

function milestoneLabel(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${amount / 1_00_00_000}Cr`;
  return `₹${amount / 1_00_000}L`;
}

export function normalizeCrossedMilestones(raw: unknown): CrossedMilestone[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "number") {
      return {
        amount: item,
        netWorthAtCrossing: item,
        crossedAt: new Date().toISOString(),
      };
    }
    const entry = item as CrossedMilestone;
    return {
      amount: entry.amount,
      netWorthAtCrossing: entry.netWorthAtCrossing ?? entry.amount,
      crossedAt: entry.crossedAt ?? new Date().toISOString(),
    };
  });
}

function milestoneCrossed(crossed: CrossedMilestone[], amount: number): boolean {
  return crossed.some((c) => c.amount === amount);
}

export function appendTimelineEvent(
  profile: MemberWealthProfile,
  event: Omit<WealthTimelineEvent, "id">,
): void {
  const events = [...(profile.timelineEvents ?? [])];
  const duplicate = events.some(
    (e) => e.type === event.type && e.at === event.at && e.label === event.label,
  );
  if (duplicate) return;
  events.unshift({
    ...event,
    id: `evt-${crypto.randomUUID()}`,
  });
  profile.timelineEvents = events.slice(0, 200);
}

export function ensureAccountCreatedEvent(profile: MemberWealthProfile): void {
  if (!profile.accountCreatedAt) {
    profile.accountCreatedAt = profile.updatedAt;
  }
  const hasAccount = (profile.timelineEvents ?? []).some((e) => e.type === "account_created");
  if (!hasAccount) {
    appendTimelineEvent(profile, {
      type: "account_created",
      at: profile.accountCreatedAt,
      label: "Account created",
      description: "Your Aurelius wealth profile was created.",
      netWorthAfter: 0,
    });
  }
}

export function recordNetWorthMilestones(
  profile: MemberWealthProfile,
  netWorth: number,
  at: string,
): void {
  const crossed = normalizeCrossedMilestones(profile.crossedMilestones);
  for (const m of MILESTONES) {
    if (netWorth >= m && !milestoneCrossed(crossed, m)) {
      crossed.push({
        amount: m,
        netWorthAtCrossing: netWorth,
        crossedAt: at,
      });
      appendTimelineEvent(profile, {
        type: "milestone",
        at,
        label: `Net worth crossed ${milestoneLabel(m)}`,
        description: `Your net worth reached ${formatInr(netWorth)} when you crossed ${milestoneLabel(m)}.`,
        netWorthAfter: netWorth,
      });
    }
  }
  profile.crossedMilestones = crossed;
}

export function buildTimelineFromProfile(profile: MemberWealthProfile): WealthTimelineEvent[] {
  const events = [...(profile.timelineEvents ?? [])];
  const hasAccount = events.some((e) => e.type === "account_created");
  if (!hasAccount && profile.accountCreatedAt) {
    events.push({
      id: "evt-account-created",
      type: "account_created",
      at: profile.accountCreatedAt,
      label: "Account created",
      description: "Your Aurelius wealth profile was created.",
      netWorthAfter: 0,
    });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

export const TIMELINE_EVENT_ICONS: Record<string, string> = {
  account_created: "🟡",
  first_asset: "🟢",
  asset_added: "🟢",
  asset_updated: "🟢",
  asset_deleted: "🟢",
  liability_added: "🔴",
  liability_deleted: "🔴",
  loan_payment: "💛",
  loan_closed: "✅",
  milestone: "🏆",
  document_uploaded: "📄",
  ai_brief_generated: "🤖",
};
