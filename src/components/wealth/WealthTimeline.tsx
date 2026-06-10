import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInr, filterSnapshotsByRange } from "@/lib/wealth/calculations";
import type { CrossedMilestone, PortfolioSnapshot } from "@/lib/wealth/types";

const RANGES = [
  { key: "3m" as const, label: "3M" },
  { key: "6m" as const, label: "6M" },
  { key: "1y" as const, label: "1Y" },
  { key: "all" as const, label: "All" },
];

const TABS = [
  { key: "net_worth" as const, label: "Net Worth Growth" },
  { key: "asset_liability" as const, label: "Asset vs Liability" },
  { key: "mom" as const, label: "Month over Month" },
];

function formatAxisDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function InrTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs border border-border/60">
      <p className="text-muted-foreground mb-1">{label ? formatAxisDate(label) : ""}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-medium tabular-nums">
          {p.name}: {formatInr(p.value)}
        </p>
      ))}
    </div>
  );
}

function milestoneChartLabel(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${amount / 1_00_00_000}Cr`;
  return `₹${amount / 1_00_000}L`;
}

export function WealthTimeline({
  snapshots,
  crossedMilestones,
}: {
  snapshots?: PortfolioSnapshot[];
  crossedMilestones?: CrossedMilestone[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("net_worth");
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("1y");

  const filtered = useMemo(
    () => filterSnapshotsByRange(snapshots ?? [], range),
    [snapshots, range],
  );

  const chartData = useMemo(
    () =>
      filtered.map((s) => ({
        at: s.at,
        netWorth: s.netWorth,
        assets: s.totalAssets,
        liabilities: s.totalLiabilities,
        month: formatAxisDate(s.at),
      })),
    [filtered],
  );

  const milestoneMarkers = useMemo(() => {
    return (crossedMilestones ?? [])
      .map((m) => {
        const month = formatAxisDate(m.crossedAt);
        const point = chartData.find((d) => d.month === month);
        return {
          ...m,
          month,
          y: point?.netWorth ?? m.netWorthAtCrossing,
        };
      })
      .filter((m) => chartData.some((d) => d.month === m.month));
  }, [crossedMilestones, chartData]);

  const momData = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const s of filtered) {
      const key = s.at.slice(0, 7);
      byMonth.set(key, s.netWorth);
    }
    return [...byMonth.entries()].map(([month, netWorth]) => ({
      month,
      netWorth,
      label: new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    }));
  }, [filtered]);

  if ((snapshots?.length ?? 0) < 2) {
    return (
      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-xl mb-2">Wealth timeline</h2>
        <p className="text-sm text-muted-foreground">Your timeline will appear after your second portfolio update.</p>
      </section>
    );
  }

  return (
    <section className="glass rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-display text-xl">Wealth timeline</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`px-3 py-1 rounded-lg text-xs ${range === r.key ? "bg-foreground text-background" : "hairline text-muted-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs ${tab === t.key ? "bg-gold/15 text-gold border border-gold/25" : "text-muted-foreground hairline"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {tab === "net_worth" ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
              <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
              <Tooltip content={<InrTooltip />} />
              <Line type="monotone" dataKey="netWorth" name="Net worth" stroke="#C9A84C" strokeWidth={2} dot={false} animationDuration={800} />
              {milestoneMarkers.map((m) => (
                <ReferenceDot
                  key={`${m.amount}-${m.crossedAt}`}
                  x={m.month}
                  y={m.y}
                  r={5}
                  fill="#C9A84C"
                  stroke="#0a0e1a"
                  strokeWidth={2}
                  label={{
                    value: milestoneChartLabel(m.amount),
                    position: "top",
                    fill: "#C9A84C",
                    fontSize: 9,
                  }}
                />
              ))}
            </LineChart>
          ) : tab === "asset_liability" ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
              <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
              <Tooltip content={<InrTooltip />} />
              <Area type="monotone" dataKey="assets" name="Assets" stackId="1" stroke="#C9A84C" fill="#C9A84C" fillOpacity={0.4} animationDuration={800} />
              <Area type="monotone" dataKey="liabilities" name="Liabilities" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.35} animationDuration={800} />
            </AreaChart>
          ) : (
            <BarChart data={momData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
              <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
              <Tooltip content={<InrTooltip />} />
              <Bar dataKey="netWorth" name="Net worth" fill="#C9A84C" radius={[4, 4, 0, 0]} animationDuration={800} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
