import { format } from "date-fns";
import { FolderLock, Loader2, RefreshCw, Share2, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { saveMarketBriefToVault } from "@/lib/member/client";
import type { MarketBrief, MarketNewsItem } from "@/lib/market/types";

type Props = {
  brief?: MarketBrief;
  news?: MarketNewsItem[];
  loading?: boolean;
  refreshing?: boolean;
  isDemo?: boolean;
  onRefresh: () => void;
};

function BriefSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div className="h-3 w-20 bg-[#1a2035] rounded mb-2" />
          <div className="h-2 w-full bg-[#1a2035] rounded" />
        </div>
      ))}
    </div>
  );
}

function formatBriefContent(content: string) {
  return content.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const isLabel = /^[A-Za-z\s]+:/.test(trimmed) && trimmed.length < 40;
    if (isLabel) {
      return (
        <p key={i} className="text-[10px] uppercase tracking-wider text-[#c9a84c] mt-3 first:mt-0 mb-1">
          {trimmed.replace(/:$/, "")}
        </p>
      );
    }
    return (
      <p key={i} className="text-sm text-muted-foreground leading-relaxed">
        {trimmed}
      </p>
    );
  });
}

export function IntelligenceBriefCard({ brief, news, loading, refreshing, isDemo, onRefresh }: Props) {
  const sources = brief?.sourceHeadlines ?? news?.slice(0, 3).map((n) => ({ headline: n.headline, url: n.url }));

  async function handleSaveVault() {
    if (!brief || isDemo) {
      toast.info(isDemo ? "Locked in demo." : "No brief to save.");
      return;
    }
    try {
      await saveMarketBriefToVault(brief.content);
      toast.success("Brief saved to Vault.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    }
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-[#0a0e1a]/80 p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#c9a84c]" />
          <h3 className="font-display text-lg">Today&apos;s Intelligence Brief</h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing || loading}
          className="h-8 px-3 rounded-lg border border-[#c9a84c]/30 text-xs text-[#c9a84c] inline-flex items-center gap-1.5 hover:bg-[#c9a84c]/10 disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      {loading || !brief ? (
        <BriefSkeleton />
      ) : (
        <div className="space-y-1">{formatBriefContent(brief.content)}</div>
      )}

      {brief && (
        <>
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/30">
            <button
              type="button"
              onClick={handleSaveVault}
              disabled={isDemo}
              className="hairline h-8 px-3 rounded-lg text-xs inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <FolderLock className="h-3 w-3" /> Save to Vault
            </button>
            <Link
              to="/dashboard/experts"
              className="hairline h-8 px-3 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <Share2 className="h-3 w-3" /> Share with Expert
            </Link>
          </div>

          {sources && sources.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Sources</p>
              <ul className="space-y-1">
                {sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c9a84c] hover:underline line-clamp-1">
                      {s.headline}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground mt-3">
            Generated {format(new Date(brief.generatedAt), "d MMM yyyy, h:mm a")}
          </p>
        </>
      )}
    </div>
  );
}
