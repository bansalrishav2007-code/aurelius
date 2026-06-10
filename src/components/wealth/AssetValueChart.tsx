import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInr } from "@/lib/wealth/calculations";
import type { WealthAsset } from "@/lib/wealth/types";

const RANGES = [
  { key: "1m" as const, label: "1M", days: 30 },
  { key: "3m" as const, label: "3M", days: 90 },
  { key: "6m" as const, label: "6M", days: 180 },
  { key: "1y" as const, label: "1Y", days: 365 },
  { key: "all" as const, label: "All", days: null },
];

const ASSET_COLORS = ["#60a5fa", "#34d399", "#a78bfa", "#f472b6", "#fb923c", "#38bdf8"];

type ChartRow = Record<string, string | number>;

function buildSeries(assets: WealthAsset[]) {
  const dateSet = new Set<string>();
  const perAsset: Record<string, { at: string; value: number }[]> = {};

  for (const asset of assets) {
    const points = asset.valueHistory?.length
      ? asset.valueHistory
      : [{ value: asset.value, at: asset.createdAt }];
    perAsset[asset.id] = points.map((p) => ({ at: p.at, value: p.value }));
    for (const p of points) dateSet.add(p.at.slice(0, 10));
  }

  const dates = [...dateSet].sort();
  const rows: ChartRow[] = dates.map((d) => {
    const row: ChartRow = { date: d };
    let total = 0;
    for (const asset of assets) {
      const history = perAsset[asset.id] ?? [];
      const latest = [...history].reverse().find((h) => h.at.slice(0, 10) <= d);
      const val = latest?.value ?? 0;
      row[asset.id] = val;
      total += val;
    }
    row.netWorth = total;
    return row;
  });

  return rows;
}

function filterByRange(rows: ChartRow[], range: (typeof RANGES)[number]["key"]) {
  const cfg = RANGES.find((r) => r.key === range);
  if (!cfg?.days) return rows;
  const cutoff = Date.now() - cfg.days * 86_400_000;
  return rows.filter((r) => new Date(String(r.date)).getTime() >= cutoff);
}

export function AssetValueChart({ assets }: { assets: WealthAsset[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("all");

  const chartData = useMemo(() => filterByRange(buildSeries(assets), range), [assets, range]);

  const singlePointOnly = assets.every(
    (a) => (a.valueHistory?.length ?? 1) <= 1,
  );

  if (assets.length === 0) return null;

  return (
    <section className="glass rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-display text-xl">Asset value tracking</h2>
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

      {singlePointOnly && (
        <p className="text-xs text-muted-foreground">
          Update your asset values periodically to track your wealth trajectory.
        </p>
      )}

      <div className="h-72 w-full rounded-xl p-2" style={{ backgroundColor: "#0a0e1a" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#1a2035" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
              stroke="#1a2035"
              tickFormatter={(v) =>
                new Date(v).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
              }
            />
            <YAxis
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
              stroke="#1a2035"
              tickFormatter={(v) => `₹${(Number(v) / 100000).toFixed(0)}L`}
            />
            <Tooltip
              contentStyle={{ background: "#0a0e1a", border: "1px solid #1a2035", borderRadius: 8 }}
              labelStyle={{ color: "rgba(255,255,255,0.6)" }}
              formatter={(value: number, name: string) => {
                const asset = assets.find((a) => a.id === name);
                const label = name === "netWorth" ? "Net worth (assets)" : asset?.name ?? name;
                return [formatInr(value), label];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => {
                if (value === "netWorth") return "Net worth";
                return assets.find((a) => a.id === value)?.name ?? value;
              }}
            />
            {assets.map((a, i) => (
              <Line
                key={a.id}
                type="monotone"
                dataKey={a.id}
                stroke={ASSET_COLORS[i % ASSET_COLORS.length]}
                strokeWidth={1.5}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="#c9a84c"
              strokeWidth={2.5}
              dot={false}
              name="netWorth"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
