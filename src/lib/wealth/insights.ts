import type { DocumentCategory } from "@/lib/vault/types";

export type AllocationSlice = { name: string; value: number; color: string };
export type LiabilityPoint = { m: string; projected: number; optimised: number };

const CATEGORY_META: Record<DocumentCategory, { name: string; color: string }> = {
  ITR: { name: "Tax & Compliance", color: "var(--primary)" },
  "Form 16": { name: "Employment Income", color: "var(--gold)" },
  GST: { name: "Business & GST", color: "var(--warning)" },
  Financials: { name: "Financial Statements", color: "var(--success)" },
  Property: { name: "Real Estate", color: "var(--primary)" },
  Legal: { name: "Legal & Trusts", color: "var(--muted-foreground)" },
  Remittance: { name: "Cross-border", color: "var(--gold)" },
  Investments: { name: "Investments", color: "var(--success)" },
  Other: { name: "Other Holdings", color: "var(--muted-foreground)" },
};

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

export function computeWealthInsights(input: {
  categories: DocumentCategory[];
  goalCount: number;
  analyzedCount: number;
}) {
  const hasData = input.categories.length > 0;

  const counts = new Map<string, number>();
  for (const cat of input.categories) {
    const label = CATEGORY_META[cat].name;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const total = input.categories.length || 1;
  const allocation: AllocationSlice[] = hasData
    ? [...counts.entries()].map(([name, count]) => ({
        name,
        value: Math.round((count / total) * 100),
        color: Object.values(CATEGORY_META).find((m) => m.name === name)?.color ?? "var(--primary)",
      }))
    : [
        { name: "Awaiting vault data", value: 100, color: "var(--muted-foreground)" },
      ];

  const base = 2.5 + input.categories.length * 0.15 + input.goalCount * 0.1;
  const savings = Math.min(1.2, 0.2 + input.analyzedCount * 0.08 + input.goalCount * 0.05);

  const liabilityTrend: LiabilityPoint[] = MONTHS.map((m, i) => {
    const drift = i * 0.04;
    const projected = +(base + drift).toFixed(2);
    const optimised = +(projected - savings * (1 + i * 0.02)).toFixed(2);
    return { m, projected, optimised };
  });

  return { allocation, liabilityTrend, hasData };
}
