import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/client/PageHeader";
import { fetchMyBookings } from "@/lib/experts/client";
import { formatInr } from "@/lib/experts/pricing";
import type { ExpertBooking } from "@/lib/experts/types";

export const Route = createFileRoute("/_app/experts/bookings")({
  head: () => ({ meta: [{ title: "My Consultations — Aurelius" }] }),
  component: MyBookingsPage,
});

const statusLabel: Record<ExpertBooking["status"], string> = {
  pending_payment: "Awaiting payment",
  pending_expert: "Awaiting expert confirmation",
  confirmed: "Confirmed",
  rejected: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
};

function MyBookingsPage() {
  const [bookings, setBookings] = useState<(ExpertBooking & { expertName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyBookings()
      .then((d) => setBookings(d.bookings))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-5 lg:p-10 max-w-[900px] mx-auto">
      <Link to="/experts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-3.5 w-3.5" />
        Experts
      </Link>

      <PageHeader title="My consultations" subtitle="Track advisory bookings, confirmations, and completed sessions." />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading bookings…</p>
      ) : bookings.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No consultations booked yet.</p>
          <Link to="/experts" className="inline-flex h-9 px-4 items-center rounded-lg bg-foreground text-background text-xs font-medium">
            Browse experts
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="glass rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <p className="font-display text-lg">{b.expertName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(b.scheduledAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
                  </p>
                  {b.notes && <p className="text-xs text-muted-foreground mt-2">{b.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gold">{formatInr(b.finalAmountPaise)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{statusLabel[b.status]}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 font-mono">{b.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
