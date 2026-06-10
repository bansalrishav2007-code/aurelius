import { X } from "lucide-react";
import type { HealthScoreSummary } from "@/lib/wealth/types";

export function PortfolioHealthModal({
  open,
  health,
  onClose,
}: {
  open: boolean;
  health?: HealthScoreSummary | null;
  onClose: () => void;
}) {
  if (!open || !health) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-background/70 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border/60 shadow-luxury p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#0a0e1a" }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-xl text-gold">Portfolio health breakdown</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Score: <span className="text-foreground font-medium">{health.score}/100</span> — {health.bandLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {(health.breakdown ?? []).map((row) => {
            const pct = row.max > 0 ? Math.round((row.points / row.max) * 100) : 0;
            return (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{row.label}</span>
                  <span className="text-muted-foreground">
                    {row.points}/{row.max}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                  <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground mt-4">{health.downside}</p>
        <p className="text-sm mt-2">
          <span className="text-gold font-medium">Top fix:</span> {health.topFix}
        </p>
      </div>
    </div>
  );
}
