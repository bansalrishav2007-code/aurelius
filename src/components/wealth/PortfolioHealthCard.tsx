import { Sparkles } from "lucide-react";
import type { HealthScoreSummary } from "@/lib/wealth/types";

export function PortfolioHealthCard({ health }: { health?: HealthScoreSummary }) {
  if (!health) return null;

  return (
    <section className="glass rounded-2xl p-6 border border-border/60">
      <h2 className="font-display text-lg mb-4">Portfolio health score</h2>
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke={health.bandColor}
              strokeWidth="3"
              strokeDasharray={`${health.score} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-display text-2xl">{health.score}</span>
        </div>
        <div className="flex-1 space-y-2">
          <span
            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block"
            style={{ color: health.bandColor, borderColor: `${health.bandColor}40`, background: `${health.bandColor}15` }}
          >
            {health.bandLabel}
          </span>
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
            {health.downside}
          </p>
          <p className="text-sm">
            <span className="text-gold font-medium">Top fix:</span> {health.topFix}
          </p>
        </div>
      </div>
    </section>
  );
}
