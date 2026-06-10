import { formatInr } from "@/lib/wealth/calculations";
import { buildTimelineFromProfile, TIMELINE_EVENT_ICONS } from "@/lib/wealth/timeline-events";
import type { MemberWealthProfile } from "@/lib/wealth/types";

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WealthActivityTimeline({ profile }: { profile?: MemberWealthProfile | null }) {
  const events = profile ? buildTimelineFromProfile(profile) : [];

  if (events.length === 0) {
    return (
      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-xl mb-2">Wealth timeline</h2>
        <p className="text-sm text-muted-foreground">
          Your timeline will populate as you add assets, update values, and reach net worth milestones.
        </p>
      </section>
    );
  }

  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="font-display text-xl mb-6">Wealth timeline</h2>
      <div className="relative pl-6 border-l-2 border-[#c9a84c]/70 space-y-6">
        {events.map((evt) => (
          <div key={evt.id} className="relative">
            <span
              className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full border-2 border-[#c9a84c] bg-background"
              aria-hidden
            />
            <div className="rounded-xl border border-border/40 bg-card/40 px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                <p className="text-sm font-medium">
                  <span className="mr-1.5" aria-hidden>{TIMELINE_EVENT_ICONS[evt.type] ?? "•"}</span>
                  {evt.label}
                </p>
                <span className="text-[10px] text-muted-foreground shrink-0">{formatEventDate(evt.at)}</span>
              </div>
              {evt.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{evt.description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                {evt.valueChange != null && evt.valueChange !== 0 && (
                  <span className={evt.valueChange > 0 ? "text-success" : "text-red-400"}>
                    {evt.valueChange > 0 ? "+" : ""}
                    {formatInr(evt.valueChange)}
                  </span>
                )}
                {evt.netWorthAfter != null && (
                  <span className="text-muted-foreground">
                    Net worth: <span className="text-gold">{formatInr(evt.netWorthAfter)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
