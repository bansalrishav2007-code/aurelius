import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FounderShell, FounderStat } from "@/components/founder/FounderShell";
import { fetchFounderOverview } from "@/lib/founder/client";

export const Route = createFileRoute("/_app/founder/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Founder" }] }),
  component: FounderAnalyticsPage,
});

function FounderAnalyticsPage() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalMembers: 0,
    activeSubscriptions: 0,
    totalRevenueCr: "0.00",
    pendingApplications: 0,
    openTickets: 0,
  });
  const [byMember, setByMember] = useState<Record<string, { chat: number; upload: number; analyze: number }>>({});

  useEffect(() => {
    fetchFounderOverview()
      .then((data) => {
        setStats(data.stats);
        setByMember(data.usage.byMember);
      })
      .catch(console.error);
  }, []);

  const memberEntries = Object.entries(byMember).sort((a, b) => {
    const totalA = a[1].chat + a[1].upload + a[1].analyze;
    const totalB = b[1].chat + b[1].upload + b[1].analyze;
    return totalB - totalA;
  });

  return (
    <FounderShell title="Analytics" subtitle="Platform usage, engagement, and operational metrics.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <FounderStat label="AI events" value={String(stats.totalEvents)} />
        <FounderStat label="Active members" value={String(stats.totalMembers)} />
        <FounderStat label="Subscriptions" value={String(stats.activeSubscriptions)} />
        <FounderStat label="Revenue" value={`₹${stats.totalRevenueCr} Cr`} />
        <FounderStat label="Pending applications" value={String(stats.pendingApplications)} />
        <FounderStat label="Open tickets" value={String(stats.openTickets)} />
      </div>

      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-xl mb-4">Usage by member</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {memberEntries.map(([email, counts]) => {
            const total = counts.chat + counts.upload + counts.analyze;
            return (
              <div key={email} className="panel-muted rounded-xl p-4 text-xs">
                <p className="truncate text-muted-foreground mb-2">{email}</p>
                <p className="font-display text-2xl mb-2">{total}</p>
                <p className="text-muted-foreground">Chat {counts.chat} · Upload {counts.upload} · Analyze {counts.analyze}</p>
              </div>
            );
          })}
        </div>
        {memberEntries.length === 0 && (
          <p className="text-sm text-muted-foreground">No usage data yet. Activity appears when members use AI, vault, and analysis features.</p>
        )}
      </section>
    </FounderShell>
  );
}
