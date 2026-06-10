import { Shield, Star, Clock } from "lucide-react";
import { ExpertAvatar } from "@/components/experts/ExpertAvatar";
import type { DashboardExpert } from "@/lib/experts/client";

type Props = {
  expert: DashboardExpert;
  onViewProfile: () => void;
  onRequestIntro: () => void;
  onBook?: () => void;
};

export function ExpertDirectoryCard({ expert, onViewProfile, onRequestIntro, onBook }: Props) {
  const designation = `${expert.profession.split("·")[0]?.trim() ?? expert.profession} · ${expert.city ?? "India"}`;

  return (
    <article className="rounded-2xl border border-border/40 bg-[#0a0e1a]/80 p-5 flex flex-col transition-all hover:border-[#c9a84c]/40 hover:shadow-[0_0_24px_rgba(201,168,76,0.08)]">
      <div className="flex items-start gap-4 mb-4">
        <ExpertAvatar name={expert.name} photoUrl={expert.photoUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-lg truncate">{expert.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{designation}</p>
            </div>
            {expert.verified !== false && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border border-[#c9a84c]/40 text-[#c9a84c] bg-[#c9a84c]/10">
                <Shield className="h-3 w-3" />
                Verified
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {(expert.displayTags ?? []).slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-2 py-0.5 rounded-md border border-border/50 text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
        {expert.tagline ?? expert.specialization}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground mb-4">
        <span className="inline-flex items-center gap-1 text-gold">
          <Star className="h-3 w-3 fill-gold" /> {expert.rating.toFixed(1)}
        </span>
        <span>{expert.yearsExperience} yrs</span>
        <span>{expert.languages.slice(0, 2).join(", ")}</span>
        <span className={`inline-flex items-center gap-1 ${expert.availableThisWeek ? "text-emerald-400" : "text-muted-foreground"}`}>
          <Clock className="h-3 w-3" />
          {expert.availabilityStatus === "waitlist" ? "Waitlist" : expert.availableNow ? "Available now" : expert.availableThisWeek ? "This week" : "Limited"}
        </span>
      </div>

      <div className="flex gap-2 pt-4 border-t border-border/30">
        <button
          type="button"
          onClick={onViewProfile}
          className="h-9 px-3 rounded-xl border border-border/50 text-xs hover:border-[#c9a84c]/30 transition-colors"
        >
          Profile
        </button>
        {expert.canBook && onBook ? (
          <button
            type="button"
            onClick={onBook}
            className="flex-1 h-9 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-xs font-medium hover:bg-[#c9a84c]/90 transition-colors"
          >
            Book a Session
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequestIntro}
            className="flex-1 h-9 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-xs font-medium hover:bg-[#c9a84c]/90 transition-colors"
          >
            Request Introduction
          </button>
        )}
      </div>
    </article>
  );
}
