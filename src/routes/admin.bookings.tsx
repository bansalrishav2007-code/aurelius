import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, ArrowLeft } from "lucide-react";
import { adminBookingAction, fetchAdminBookings } from "@/lib/experts/client";
import { formatInr } from "@/lib/experts/pricing";
import { SERVICE_TYPE_LABELS } from "@/lib/experts/service-types";
import type { ExpertBooking } from "@/lib/experts/types";

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({ meta: [{ title: "Bookings Admin — Aurelius" }] }),
  component: AdminBookingsPage,
});

function AdminBookingsPage() {
  const [bookings, setBookings] = useState<(ExpertBooking & { expertName: string; memberLabel: string })[]>([]);
  const [stats, setStats] = useState<{
    monthTotal: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    revenuePaise: number;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAdminBookings(statusFilter === "all" ? undefined : statusFilter);
      setBookings(data.bookings);
      setStats(data.stats);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [statusFilter]);

  async function act(bookingId: string, action: "confirm" | "reject" | "cancel" | "complete") {
    setBusy(bookingId);
    try {
      await adminBookingAction(bookingId, action);
      await load();
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="min-h-screen bg-[#050810] text-foreground p-6 lg:p-10">
      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-6">
        <ArrowLeft className="h-3 w-3" /> Admin
      </Link>

      <h1 className="font-display text-3xl mb-2 flex items-center gap-2">
        <Calendar className="h-6 w-6 text-gold" /> Consultation Bookings
      </h1>
      <p className="text-sm text-muted-foreground mb-8">Manage expert sessions, overrides, and revenue.</p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          {[
            { label: "This month", value: stats.monthTotal },
            { label: "Pending", value: stats.pending },
            { label: "Confirmed", value: stats.confirmed },
            { label: "Completed", value: stats.completed },
            { label: "Cancelled", value: stats.cancelled },
            { label: "Revenue", value: formatInr(stats.revenuePaise) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/40 p-4 bg-[#0a0e1a]/80">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="font-display text-xl mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-9 rounded-lg border border-border/50 bg-[#0a0e1a] px-3 text-xs mb-6"
      >
        <option value="all">All statuses</option>
        <option value="pending_expert">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="rejected">Rejected</option>
      </select>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/40">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground text-left">
                <th className="p-3">Client</th>
                <th className="p-3">Expert</th>
                <th className="p-3">Service</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-border/20">
                  <td className="p-3">{b.memberLabel}</td>
                  <td className="p-3">{b.expertName}</td>
                  <td className="p-3">{SERVICE_TYPE_LABELS[b.serviceType]}</td>
                  <td className="p-3">{new Date(b.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                  <td className="p-3">{b.status}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {b.status === "pending_expert" && (
                        <button disabled={busy === b.id} onClick={() => void act(b.id, "confirm")} className="px-2 py-1 rounded hairline">Accept</button>
                      )}
                      {["pending_expert", "confirmed"].includes(b.status) && (
                        <button disabled={busy === b.id} onClick={() => void act(b.id, "cancel")} className="px-2 py-1 rounded hairline">Cancel</button>
                      )}
                      {b.status === "confirmed" && (
                        <button disabled={busy === b.id} onClick={() => void act(b.id, "complete")} className="px-2 py-1 rounded hairline">Complete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
