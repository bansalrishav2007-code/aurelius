import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Crown } from "lucide-react";
import { FounderShell, FounderStat } from "@/components/founder/FounderShell";
import { fetchFounderOverview, type FounderOverview } from "@/lib/founder/client";

export const Route = createFileRoute("/_app/founder/")({
  head: () => ({ meta: [{ title: "Founder Overview — Aurelius" }] }),
  component: FounderOverviewPage,
});

function FounderOverviewPage() {
  const [data, setData] = useState<FounderOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFounderOverview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (error) {
    return (
      <FounderShell title="Overview" subtitle="Private office command centre">
        <p className="text-sm text-destructive">{error}</p>
      </FounderShell>
    );
  }

  if (!data) {
    return (
      <FounderShell title="Overview" subtitle="Private office command centre">
        <p className="text-sm text-muted-foreground">Loading founder dashboard…</p>
      </FounderShell>
    );
  }

  const { stats } = data;

  return (
    <FounderShell title="Overview" subtitle="Private office command centre — memberships, revenue, and operations at a glance.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <FounderStat label="Total users" value={String(stats.totalUsers)} />
        <FounderStat label="Active members" value={String(stats.totalMembers)} />
        <FounderStat label="Total revenue" value={`₹${stats.totalRevenueCr} Cr`} hint="Captured payments" />
        <FounderStat label="Active subscriptions" value={String(stats.activeSubscriptions)} />
        <FounderStat label="Pending applications" value={String(stats.pendingApplications)} />
        <FounderStat label="Open support tickets" value={String(stats.openTickets)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-4 w-4 text-gold" strokeWidth={1.5} />
            <h2 className="font-display text-xl">Quick actions</h2>
          </div>
          <div className="space-y-2">
            {[
              { to: "/founder/applications", label: "Review membership applications" },
              { to: "/founder/invites", label: "Issue client access codes" },
              { to: "/founder/clients", label: "Manage client accounts" },
              { to: "/founder/support", label: "Respond to customer queries" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center justify-between p-4 rounded-xl panel-muted hover:bg-muted/40 transition-colors group"
              >
                <span className="text-sm">{item.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
              </Link>
            ))}
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Recent activity</h2>
          <div className="space-y-3 text-xs">
            {data.usage.recent.slice(0, 6).map((ev, i) => (
              <div key={`${ev.createdAt}-${i}`} className="flex justify-between gap-4 pb-3 border-b border-border/30 last:border-0">
                <span className="text-muted-foreground truncate">{ev.memberEmail}</span>
                <span className="capitalize shrink-0">{ev.type}</span>
              </div>
            ))}
            {data.usage.recent.length === 0 && (
              <p className="text-muted-foreground">No platform activity recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    </FounderShell>
  );
}
