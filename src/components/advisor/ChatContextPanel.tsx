import { ChevronRight, Sparkles } from "lucide-react";
import { formatInr } from "@/lib/wealth/calculations";
import type { HealthScoreSummary } from "@/lib/wealth/types";

export type ChatContextData = {
  netWorth: number;
  healthScore?: HealthScoreSummary;
  unused80CHeadroom?: number;
  alerts: { id: string; message: string; severity: string }[];
  intelligenceBrief?: {
    summary?: string;
    recommendations: { title: string; whatToDo: string }[];
    updatedAt?: string;
  } | null;
  updatedAt: string;
};

function ContextBody({
  data,
  onHealthClick,
  onAlertClick,
}: {
  data: ChatContextData | null;
  onHealthClick?: () => void;
  onAlertClick?: (alertId: string) => void;
}) {
  if (!data) {
    return <p className="text-xs text-muted-foreground p-4">Loading wealth context…</p>;
  }

  return (
    <div className="p-4 space-y-4 text-sm">
      <div className="rounded-xl border border-gold/20 bg-gold/5 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net worth</p>
        <p className="font-display text-2xl text-gold tabular-nums mt-1">{formatInr(data.netWorth)}</p>
      </div>
      {data.healthScore && (
        <button
          type="button"
          onClick={onHealthClick}
          className="w-full text-left panel-muted rounded-xl p-3 hover:border-gold/30 border border-transparent transition-colors"
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolio health</p>
          <p className="font-display text-xl mt-1">
            {data.healthScore.score}
            <span className="text-sm text-muted-foreground">/100</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{data.healthScore.bandLabel}</p>
          <p className="text-[10px] text-gold mt-1">Tap for breakdown</p>
        </button>
      )}
      {data.alerts.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Active alerts</p>
          <ul className="space-y-2">
            {data.alerts.slice(0, 3).map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onAlertClick?.(a.id)}
                  className={`w-full text-left text-xs leading-relaxed border-l-2 pl-2 py-1 transition-opacity hover:opacity-90 ${
                    a.id === "unused-80c" ? "border-gold text-gold/90 cursor-pointer" : "border-gold/40 text-muted-foreground"
                  }`}
                >
                  {a.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.intelligenceBrief && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-gold" /> Intelligence brief
          </p>
          {data.intelligenceBrief.summary && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">{data.intelligenceBrief.summary}</p>
          )}
          <ul className="space-y-2">
            {data.intelligenceBrief.recommendations.map((r, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium">{r.title}</span>
                <p className="text-muted-foreground mt-0.5">{r.whatToDo}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Updated {new Date(data.updatedAt).toLocaleDateString("en-IN")}
      </p>
    </div>
  );
}

export function ChatContextPanel({
  data,
  open,
  onToggle,
  onHealthClick,
  onAlertClick,
}: {
  data: ChatContextData | null;
  open: boolean;
  onToggle: () => void;
  onHealthClick?: () => void;
  onAlertClick?: (alertId: string) => void;
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-10 hairline rounded-l-xl px-2 py-4 bg-card/80 hover:bg-card"
        title="Show wealth context"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
      </button>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col w-72 border-l border-border/50 bg-sidebar/30 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Wealth context</p>
        <button type="button" onClick={onToggle} className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <ContextBody data={data} onHealthClick={onHealthClick} onAlertClick={onAlertClick} />
    </aside>
  );
}

export function ChatContextPanelOverlay({
  data,
  onClose,
  onHealthClick,
  onAlertClick,
}: {
  data: ChatContextData | null;
  onClose: () => void;
  onHealthClick?: () => void;
  onAlertClick?: (alertId: string) => void;
}) {
  return (
    <aside className="flex flex-col w-full h-full bg-sidebar/95 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Wealth context</p>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <ContextBody data={data} onHealthClick={onHealthClick} onAlertClick={onAlertClick} />
    </aside>
  );
}
