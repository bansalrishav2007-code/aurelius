import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FounderShell, FounderStat } from "@/components/founder/FounderShell";
import { fetchFounderExpertBookings, fetchFounderExperts } from "@/lib/experts/client";
import { formatInr } from "@/lib/experts/pricing";
import type { ExpertBooking } from "@/lib/experts/types";

export const Route = createFileRoute("/_app/founder/expert-bookings")({
  head: () => ({ meta: [{ title: "Expert Bookings — Founder" }] }),
  component: FounderExpertBookingsPage,
});

type EnrichedBooking = ExpertBooking & { expertName: string; memberLabel: string };

const statusLabel: Record<ExpertBooking["status"], string> = {
  pending_payment: "Awaiting payment",
  pending_expert: "Pending expert",
  confirmed: "Confirmed",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

function FounderExpertBookingsPage() {
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    Promise.all([fetchFounderExpertBookings(), fetchFounderExperts()])
      .then(([b, e]) => {
        setBookings(b.bookings as EnrichedBooking[]);
        setRevenue(e.revenue.totalRevenuePaise);
      })
      .catch(console.error);
  }, []);

  return (
    <FounderShell title="Consultation bookings" subtitle="View all expert appointments, payment status, and platform revenue from advisory consultations.">
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <FounderStat label="Total consultation revenue" value={formatInr(revenue)} />
        <FounderStat label="Total bookings" value={String(bookings.length)} />
        <FounderStat
          label="Captured payments"
          value={String(bookings.filter((b) => b.paymentStatus === "captured").length)}
        />
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                <th className="py-3 px-4 font-normal">Member</th>
                <th className="py-3 px-4 font-normal">Expert</th>
                <th className="py-3 px-4 font-normal">Scheduled</th>
                <th className="py-3 px-4 font-normal">Amount</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 px-4 font-normal">Payment</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">
                    No consultation bookings yet.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="border-b border-border/20">
                    <td className="py-3 px-4">
                      <p>{b.memberName}</p>
                      <p className="text-muted-foreground">{b.memberEmail}</p>
                    </td>
                    <td className="py-3 px-4">{b.expertName}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(b.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="py-3 px-4">{formatInr(b.finalAmountPaise)}</td>
                    <td className="py-3 px-4">{statusLabel[b.status]}</td>
                    <td className="py-3 px-4 capitalize">{b.paymentStatus}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FounderShell>
  );
}
