import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuthSession } from "@/lib/auth/session.functions";
import { useEffect, useState } from "react";
import { Clock, Link as LinkIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/client/PageHeader";
import { fetchExpertAppointments, updateExpertPortalAvailability } from "@/lib/experts/client";
import type { ExpertProfile } from "@/lib/experts/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOT_OPTIONS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export const Route = createFileRoute("/_app/expert/availability")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (!session || session.role !== "EXPERT") {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Availability — Expert Portal" }] }),
  component: ExpertAvailabilityPage,
});

function ExpertAvailabilityPage() {
  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExpertAppointments()
      .then((d) => setExpert(d.expert))
      .finally(() => setLoading(false));
  }, []);

  async function save(updates: ExpertProfile["availability"]) {
    if (!expert) return;
    setSaving(true);
    try {
      const res = await updateExpertPortalAvailability(updates);
      setExpert(res.expert);
    } finally {
      setSaving(false);
    }
  }

  function toggleSlot(day: 0 | 1 | 2 | 3 | 4 | 5 | 6, slot: string) {
    if (!expert) return;
    const weekly = [...expert.availability.weeklyHours];
    let entry = weekly.find((w) => w.day === day);
    if (!entry) {
      entry = { day, slots: [] };
      weekly.push(entry);
    }
    entry.slots = entry.slots.includes(slot)
      ? entry.slots.filter((s) => s !== slot)
      : [...entry.slots, slot].sort();
    void save({ ...expert.availability, weeklyHours: weekly });
  }

  function toggleBlocked(date: string) {
    if (!expert) return;
    const blocked = expert.availability.blockedDates.includes(date)
      ? expert.availability.blockedDates.filter((d) => d !== date)
      : [...expert.availability.blockedDates, date];
    void save({ ...expert.availability, blockedDates: blocked });
  }

  const upcomingDates = Array.from({ length: 21 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  if (loading || !expert) return <p className="p-10 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="p-5 lg:p-10 max-w-[900px] mx-auto">
      <Link to="/expert" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
        <LinkIcon className="h-3 w-3" /> Expert portal
      </Link>
      <PageHeader title="Availability" subtitle="Weekly schedule and blocked dates · Timezone: IST (Asia/Kolkata)" />

      <section className="glass rounded-2xl p-6 mb-8">
        <h2 className="font-display text-lg mb-4 flex items-center gap-2"><Clock className="h-4 w-4" /> Weekly hours</h2>
        <p className="text-xs text-muted-foreground mb-4">15-minute buffer applied automatically between sessions.</p>
        <div className="space-y-4">
          {([1, 2, 3, 4, 5, 6, 0] as const).map((day) => {
            const entry = expert.availability.weeklyHours.find((w) => w.day === day);
            return (
              <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="w-12 text-xs text-muted-foreground">{DAY_LABELS[day]}</span>
                <div className="flex flex-wrap gap-1">
                  {SLOT_OPTIONS.map((slot) => {
                    const active = entry?.slots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(day, slot)}
                        disabled={saving}
                        className={`h-7 px-2 rounded text-[10px] ${active ? "bg-[#c9a84c] text-[#0a0e1a]" : "hairline"}`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg mb-4">Block dates</h2>
        <div className="flex flex-wrap gap-2">
          {upcomingDates.map((date) => {
            const blocked = expert.availability.blockedDates.includes(date);
            return (
              <button
                key={date}
                type="button"
                onClick={() => toggleBlocked(date)}
                disabled={saving}
                className={`h-9 px-3 rounded-lg text-xs ${blocked ? "bg-destructive/20 text-destructive hairline" : "hairline"}`}
              >
                {new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
