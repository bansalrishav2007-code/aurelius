import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { format } from "date-fns";
import type { MacroIndicator } from "@/lib/market/types";

type Props = {
  indicators: MacroIndicator[];
  updatedAt?: string;
  loading?: boolean;
};

export function MacroIndicatorsGrid({ indicators, updatedAt, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#1a2035]/60 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {indicators.map((ind) => {
          const up = ind.changePercent !== null && ind.changePercent > 0;
          const down = ind.changePercent !== null && ind.changePercent < 0;
          const Arrow = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
          const color = up ? "text-emerald-400" : down ? "text-red-400" : "text-muted-foreground";

          return (
            <div
              key={ind.id}
              className="rounded-xl border border-border/40 bg-[#0a0e1a]/80 px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{ind.label}</p>
              <p className="font-display text-xl mt-1 text-foreground">{ind.value}</p>
              <div className={`flex items-center gap-1 mt-1.5 text-xs ${color}`}>
                <Arrow className="h-3.5 w-3.5" />
                <span>{ind.changeLabel ?? "—"}</span>
              </div>
            </div>
          );
        })}
      </div>
      {updatedAt && (
        <p className="text-[10px] text-muted-foreground mt-3">
          Last updated {format(new Date(updatedAt), "d MMM yyyy, h:mm a")}
          {indicators.some((i) => !i.isLive) ? " · Some values are indicative" : ""}
        </p>
      )}
    </div>
  );
}
