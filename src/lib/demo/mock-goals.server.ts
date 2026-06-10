import { enrichGoal } from "@/lib/goals/calculations";
import type { EnrichedGoal } from "@/lib/goals/types";

function monthsAheadIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

export function getDemoGoals(memberEmail: string): EnrichedGoal[] {
  const seeds = [
    {
      id: "demo-goal-1",
      title: "Buy second home in Goa",
      category: "Real Estate" as const,
      targetAmount: 8_00_00_000,
      currentAmount: 2_40_00_000,
      targetDate: monthsAheadIso(36),
      priority: "high" as const,
      createdAt: monthsAgoIso(8),
    },
    {
      id: "demo-goal-2",
      title: "Children's education fund",
      category: "Child's Education" as const,
      targetAmount: 1_50_00_000,
      currentAmount: 95_00_000,
      targetDate: monthsAheadIso(18),
      priority: "high" as const,
      createdAt: monthsAgoIso(24),
    },
    {
      id: "demo-goal-3",
      title: "Retirement corpus by 2035",
      category: "Retirement" as const,
      targetAmount: 15_00_00_000,
      currentAmount: 4_20_00_000,
      targetDate: monthsAheadIso(120),
      priority: "medium" as const,
      createdAt: monthsAgoIso(12),
    },
  ];

  return seeds.map((s) =>
    enrichGoal({
      ...s,
      memberEmail,
      status: "active",
      updatedAt: new Date().toISOString(),
    }),
  );
}
