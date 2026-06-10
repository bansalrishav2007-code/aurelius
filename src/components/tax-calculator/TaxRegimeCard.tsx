import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatedInr } from "./AnimatedInr";
import { formatInr } from "@/lib/wealth/calculations";
import type { RegimeResult } from "@/lib/wealth/tax-calculator";

type Props = {
  result: RegimeResult;
  isWinner: boolean;
  label: string;
};

export function TaxRegimeCard({ result, isWinner, label }: Props) {
  const chartData = result.slabBreakdown
    .filter((s) => s.tax > 0)
    .map((s) => ({
      name: `${Math.round(s.rate * 100)}%`,
      tax: Math.round(s.tax),
    }));

  return (
    <div
      className={`rounded-2xl border p-5 lg:p-6 transition-all ${
        isWinner
          ? "border-[#c9a84c]/60 bg-[#c9a84c]/5 shadow-[0_0_24px_rgba(201,168,76,0.12)]"
          : "border-border/40 bg-card/30"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-display text-lg">{label}</h3>
        {isWinner && (
          <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-[#c9a84c]/50 text-[#c9a84c]">
            Recommended
          </span>
        )}
      </div>

      <p className="text-3xl font-display text-[#c9a84c]">
        <AnimatedInr value={Math.round(result.totalTax)} />
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Effective rate {(result.effectiveRate * 100).toFixed(1)}% · Taxable {formatInr(result.taxableIncome)}
      </p>

      <div className="mt-4 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Slab tax</span>
          <span>{formatInr(Math.round(result.slabTax))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">STCG (20%)</span>
          <span>{formatInr(Math.round(result.stcgTax))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">LTCG (12.5%)</span>
          <span>{formatInr(Math.round(result.ltcgTax))}</span>
        </div>
        {result.surcharge > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Surcharge</span>
            <span>{formatInr(Math.round(result.surcharge))}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cess (4%)</span>
          <span>{formatInr(Math.round(result.cess))}</span>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="mt-5 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: number) => formatInr(v)}
                contentStyle={{ background: "#0a0e1a", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8 }}
              />
              <Bar dataKey="tax" fill="#c9a84c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Slab breakdown</p>
        {result.slabBreakdown
          .filter((s) => s.taxableInSlab > 0)
          .map((s) => (
            <div key={s.label} className="flex justify-between text-[11px] text-muted-foreground">
              <span>
                {s.label} @ {Math.round(s.rate * 100)}%
              </span>
              <span className="text-foreground">{formatInr(Math.round(s.tax))}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
