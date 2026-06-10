import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import type { MarketNewsItem } from "@/lib/market/types";

type Props = {
  story: MarketNewsItem | null;
  loading?: boolean;
};

export function FeaturedStory({ story, loading }: Props) {
  if (loading) {
    return <div className="rounded-2xl bg-[#1a2035]/60 h-40 animate-pulse mb-6" />;
  }

  if (!story || story.url === "#") {
    return (
      <div className="rounded-2xl border border-border/40 bg-[#0a0e1a]/80 p-6 mb-6">
        <p className="text-xs uppercase tracking-wider text-[#c9a84c] mb-2">Featured</p>
        <p className="font-display text-xl text-muted-foreground">Live headlines will appear here.</p>
      </div>
    );
  }

  return (
    <a
      href={story.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl border border-[#c9a84c]/25 bg-gradient-to-br from-[#c9a84c]/8 to-transparent p-6 mb-6 group hover:border-[#c9a84c]/50 transition-all"
    >
      <p className="text-[10px] uppercase tracking-wider text-[#c9a84c] mb-2">Featured story</p>
      <h2 className="font-display text-2xl leading-snug group-hover:text-[#c9a84c] transition-colors">
        {story.headline}
      </h2>
      {story.description && (
        <p className="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed">{story.description}</p>
      )}
      <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
        <span>
          {story.source} · {formatDistanceToNow(new Date(story.publishedAt), { addSuffix: true })}
        </span>
        <span className="inline-flex items-center gap-1 text-[#c9a84c]">
          Read <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </a>
  );
}
