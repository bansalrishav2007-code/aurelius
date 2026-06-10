import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, X } from "lucide-react";
import { toast } from "sonner";
import { saveMarketBookmark } from "@/lib/member/client";
import type { MarketNewsItem, NewsFilterTab } from "@/lib/market/types";

const FILTERS: NewsFilterTab[] = ["All", "Markets", "Real Estate", "Tax & Regulation", "Global"];

const TAG_STYLES: Record<string, string> = {
  Markets: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  "Real Estate": "text-violet-400 bg-violet-400/10 border-violet-400/20",
  Tax: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  RBI: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Global: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

type Props = {
  news: MarketNewsItem[];
  allNews?: MarketNewsItem[];
  configured: boolean;
  filter: NewsFilterTab;
  loading?: boolean;
  isDemo?: boolean;
  onFilterChange: (f: NewsFilterTab) => void;
};

function buildPortfolioImpact(item: MarketNewsItem): string {
  const cat = item.category;
  if (cat === "Real Estate") return "May affect property valuations and mortgage rates in your portfolio.";
  if (cat === "Tax") return "Could impact your tax planning, 80C strategy, or capital gains position.";
  if (cat === "RBI") return "RBI policy shifts influence FD yields, loan EMIs, and equity valuations.";
  if (cat === "Global") return "Global flows may affect INR, import costs, and offshore allocations.";
  return "Equity and MF holdings may move with this development — review allocation if needed.";
}

export function MarketNewsFeed({ news, configured, filter, loading, isDemo, onFilterChange }: Props) {
  const [selected, setSelected] = useState<MarketNewsItem | null>(null);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleBookmark(item: MarketNewsItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (isDemo) {
      toast.info("Bookmarks locked in demo mode.");
      return;
    }
    if (bookmarked.has(item.id)) {
      toast.info("Already saved to vault.");
      return;
    }
    setSavingId(item.id);
    try {
      await saveMarketBookmark({
        headline: item.headline,
        url: item.url,
        source: item.source,
        description: item.description,
      });
      setBookmarked((prev) => new Set(prev).add(item.id));
      toast.success("Saved to Vault — Saved Intelligence folder.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      <div className="flex items-center gap-1 overflow-x-auto pb-3 shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={`px-3 h-8 rounded-lg text-[10px] whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-[#c9a84c] text-[#0a0e1a] font-medium"
                : "border border-border/50 text-muted-foreground hover:border-[#c9a84c]/30"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {!configured && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 mb-3 text-xs text-amber-200/90">
          Configure <code className="text-[#c9a84c]">NEWSAPI_KEY</code> in .env to enable the live feed.
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-[#1a2035]/60 h-20 animate-pulse" />
          ))
        ) : news.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No articles match your filters.</p>
        ) : (
          news.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="w-full text-left block rounded-xl border border-border/40 bg-[#0a0e1a]/80 p-4 transition-all hover:border-[#c9a84c]/40"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug text-foreground line-clamp-2 flex-1">{item.headline}</p>
                <button
                  type="button"
                  onClick={(e) => handleBookmark(item, e)}
                  disabled={savingId === item.id}
                  className={`shrink-0 p-1 rounded ${bookmarked.has(item.id) ? "text-[#c9a84c]" : "text-muted-foreground hover:text-[#c9a84c]"}`}
                  title="Save to vault"
                >
                  <Bookmark className={`h-3.5 w-3.5 ${bookmarked.has(item.id) ? "fill-current" : ""}`} />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {item.source} · {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
              </p>
              <span
                className={`inline-block mt-2 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${TAG_STYLES[item.category] ?? TAG_STYLES.Markets}`}
              >
                {item.category}
              </span>
            </button>
          ))
        )}
      </div>

      {selected && (
        <div className="absolute inset-0 z-10 flex">
          <button type="button" className="flex-1 bg-background/60" aria-label="Close" onClick={() => setSelected(null)} />
          <aside className="w-full sm:w-96 bg-[#0a0e1a] border-l border-border/60 p-5 overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-2 mb-4">
              <h3 className="font-display text-base leading-snug">{selected.headline}</h3>
              <button type="button" onClick={() => setSelected(null)} className="text-muted-foreground shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {selected.source} · {formatDistanceToNow(new Date(selected.publishedAt), { addSuffix: true })}
            </p>
            <section className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-[#c9a84c] mb-2">AI Summary</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selected.description ?? "This development may influence Indian markets and HNI portfolio positioning. Review your allocation for relevance."}
              </p>
            </section>
            <section className="mb-6 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#c9a84c] mb-2">What this means for your portfolio</p>
              <p className="text-sm leading-relaxed">{buildPortfolioImpact(selected)}</p>
            </section>
            <a
              href={selected.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#c9a84c] hover:underline"
            >
              Read original article →
            </a>
          </aside>
        </div>
      )}
    </div>
  );
}
