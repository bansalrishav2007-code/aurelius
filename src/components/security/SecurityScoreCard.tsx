import { AlertTriangle, Check } from "lucide-react";
import type { SecurityScore } from "@/lib/security/types";

type Props = {
  score: SecurityScore;
};

const BAND_COLORS: Record<SecurityScore["band"], string> = {
  EXCELLENT: "text-success",
  GOOD: "text-gold",
  FAIR: "text-amber-400",
  WEAK: "text-destructive",
};

export function SecurityScoreCard({ score }: Props) {
  return (
    <section className="glass rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Security score</p>
          <p className="font-display text-3xl mt-1">
            <span className="text-gold">{score.total}</span>
            <span className="text-muted-foreground text-lg">/100</span>
            <span className={`text-sm ml-3 ${BAND_COLORS[score.band]}`}>— {score.band}</span>
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {score.items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            {item.earned ? (
              <Check className="h-3.5 w-3.5 text-success shrink-0" />
            ) : item.warning ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            ) : (
              <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
            )}
            <span className={item.earned ? "text-foreground" : "text-muted-foreground"}>
              {item.label}
              {item.earned ? ` (+${item.points} pts)` : item.warning ? ` (-${item.points} pts)` : ""}
            </span>
          </li>
        ))}
      </ul>

      {score.tips.length > 0 && (
        <div className="rounded-xl border border-gold/20 bg-gold/5 p-4">
          <p className="text-[10px] uppercase tracking-wider text-gold mb-2">Tips to reach 100</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {score.tips.map((tip) => (
              <li key={tip}>→ {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
