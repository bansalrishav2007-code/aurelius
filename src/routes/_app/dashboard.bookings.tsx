import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { BookingTimelineCard } from "@/components/experts/BookingTimelineCard";
import { fetchMyBookings, updateMemberBooking } from "@/lib/experts/client";
import type { ExpertBooking } from "@/lib/experts/types";

export const Route = createFileRoute("/_app/dashboard/bookings")({
  head: () => ({ meta: [{ title: "My Bookings — Aurelius" }] }),
  component: DashboardBookingsPage,
});

type Enriched = ExpertBooking & { expertName: string; expertPhotoUrl?: string };

function DashboardBookingsPage() {
  const [bookings, setBookings] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyBookings();
      setBookings(data.bookings as Enriched[]);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { upcoming, pending, rejected, past } = useMemo(() => {
    const now = Date.now();
    const upcoming: Enriched[] = [];
    const pending: Enriched[] = [];
    const rejected: Enriched[] = [];
    const past: Enriched[] = [];

    for (const b of bookings) {
      if (["pending_expert", "pending_payment"].includes(b.status)) pending.push(b);
      else if (b.status === "rejected") rejected.push(b);
      else if (b.status === "completed" || b.status === "cancelled" || new Date(b.scheduledAt).getTime() < now) past.push(b);
      else if (b.status === "confirmed") upcoming.push(b);
    }

    upcoming.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    pending.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    past.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
    return { upcoming, pending, rejected, past };
  }, [bookings]);

  async function handleCancel(id: string) {
    setBusy(id);
    try {
      await updateMemberBooking(id, { action: "cancel" });
      await load();
    } finally {
      setBusy("");
    }
  }

  async function handleAcceptSuggested(id: string) {
    setBusy(id);
    try {
      await updateMemberBooking(id, { action: "accept_suggested" });
      await load();
    } finally {
      setBusy("");
    }
  }

  async function handleRate(id: string, rating: number, review: string) {
    setBusy(id);
    try {
      await updateMemberBooking(id, { action: "rate", rating, review });
      await load();
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <div className="p-5 lg:p-10 max-w-[900px] mx-auto">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-10 max-w-[900px] mx-auto min-w-0">
      <PageHeader title="My Bookings" subtitle="Upcoming sessions, pending requests, and consultation history." />

      {bookings.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No bookings yet.</p>
          <Link to="/dashboard/experts" className="inline-flex h-9 px-4 items-center rounded-lg bg-[#c9a84c] text-[#0a0e1a] text-xs font-medium">
            Browse Experts
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Upcoming</h2>
              <div className="space-y-4">
                {upcoming.map((b) => (
                  <BookingTimelineCard key={b.id} booking={b} onCancel={handleCancel} busy={busy} />
                ))}
              </div>
            </section>
          )}
          {pending.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Pending</h2>
              <div className="space-y-4">
                {pending.map((b) => (
                  <BookingTimelineCard key={b.id} booking={b} onCancel={handleCancel} busy={busy} />
                ))}
              </div>
            </section>
          )}
          {rejected.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Declined / Rescheduled</h2>
              <div className="space-y-4">
                {rejected.map((b) => (
                  <BookingTimelineCard
                    key={b.id}
                    booking={b}
                    onCancel={handleCancel}
                    onAcceptSuggested={handleAcceptSuggested}
                    busy={busy}
                  />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Past</h2>
              <div className="space-y-4">
                {past.map((b) => (
                  <BookingTimelineCard key={b.id} booking={b} onRate={handleRate} busy={busy} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
