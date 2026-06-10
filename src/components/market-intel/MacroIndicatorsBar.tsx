import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { format } from "date-fns";
import type { MacroIndicator } from "@/lib/market/types";

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 56;
  const h = 20;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline
        fill="none"
        stroke={positive ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

type Props = {
  indicators: MacroIndicator[];
  updatedAt?: string;
  loading?: boolean;
};

export function MacroIndicatorsBar({ indicators, updatedAt, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#1a2035]/60 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <section className="mb-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {indicators.map((ind) => {
          const up = ind.changePercent !== null && ind.changePercent > 0;
          const down = ind.changePercent !== null && ind.changePercent < 0;
          const flat = ind.changePercent === null || ind.changePercent === 0;
          const Arrow = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
          const color = up ? "text-emerald-400" : down ? "text-red-400" : "text-muted-foreground";

          return (
            <div key={ind.id} className="rounded-xl border border-border/40 bg-[#0a0e1a]/80 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{ind.label}</p>
              <p className="font-display text-lg mt-1 text-foreground">{ind.value}</p>
              <div className="flex items-center justify-between mt-1.5 gap-2">
                <div className={`flex items-center gap-0.5 text-xs ${color}`}>
                  <Arrow className="h-3 w-3" />
                  <span>{ind.changeLabel ?? "—"}</span>
                </div>
                {ind.trend7d && <Sparkline values={ind.trend7d} positive={!flat && up} />}
              </div>
            </div>
          );
        })}
      </div>
      {updatedAt && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Last updated {format(new Date(updatedAt), "d MMM yyyy, h:mm a")}
        </p>
      )}
    </section>
  );
}
