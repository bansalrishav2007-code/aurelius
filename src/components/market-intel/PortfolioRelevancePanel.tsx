import type { RelevanceCard } from "@/lib/market/types";

type Props = {
  cards: RelevanceCard[];
  loading?: boolean;
};

export function PortfolioRelevancePanel({ cards, loading }: Props) {
  return (
    <div className="flex flex-col h-full min-h-0 border-l-2 border-[#c9a84c] pl-5">
      <h3 className="font-display text-lg mb-1 shrink-0">Your Portfolio Impact</h3>
      <p className="text-xs text-muted-foreground mb-4 shrink-0">
        Private briefing — curated against your holdings.
      </p>

      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-[#1a2035]/60 h-24 animate-pulse" />
          ))
        ) : cards.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Add assets to your wealth profile for personalised relevance alerts.
          </p>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className="rounded-xl border border-border/30 bg-[#0a0e1a]/80 px-4 py-4"
            >
              {card.assetLabel && (
                <p className="text-[10px] uppercase tracking-wider text-[#c9a84c] mb-2">
                  {card.assetLabel}
                </p>
              )}
              <p className="text-sm font-medium leading-snug text-foreground">{card.headline}</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{card.explanation}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
