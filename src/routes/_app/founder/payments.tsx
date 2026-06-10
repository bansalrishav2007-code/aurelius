import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FounderShell, FounderStat } from "@/components/founder/FounderShell";
import { fetchFounderOverview } from "@/lib/founder/client";
import type { PaymentRecord } from "@/lib/payments/types";

export const Route = createFileRoute("/_app/founder/payments")({
  head: () => ({ meta: [{ title: "Payments — Founder" }] }),
  component: FounderPaymentsPage,
});

function formatAmount(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function FounderPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState({
    totalRevenueCr: "0.00",
    capturedCount: 0,
    pendingCount: 0,
    activeSubscriptions: 0,
  });

  useEffect(() => {
    fetchFounderOverview()
      .then((data) => {
        setPayments(data.payments);
        setSummary(data.paymentSummary);
      })
      .catch(console.error);
  }, []);

  return (
    <FounderShell title="Payments" subtitle="Revenue summary, subscription status, and payment history.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <FounderStat label="Total revenue" value={`₹${summary.totalRevenueCr} Cr`} />
        <FounderStat label="Captured payments" value={String(summary.capturedCount)} />
        <FounderStat label="Pending" value={String(summary.pendingCount)} />
        <FounderStat label="Active subscriptions" value={String(summary.activeSubscriptions)} />
      </div>

      <section className="glass rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border/30">
          <h2 className="font-display text-xl">Payment history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                <th className="py-3 px-4 font-normal">Client</th>
                <th className="py-3 px-4 font-normal">Plan</th>
                <th className="py-3 px-4 font-normal">Amount</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 px-4 font-normal">Order ID</th>
                <th className="py-3 px-4 font-normal">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border/20">
                  <td className="py-3 px-4">
                    <p>{p.memberName}</p>
                    <p className="text-muted-foreground">{p.memberEmail}</p>
                  </td>
                  <td className="py-3 px-4">{p.planName}</td>
                  <td className="py-3 px-4 tabular-nums">{formatAmount(p.amountPaise)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`capitalize ${
                        p.status === "captured" ? "text-success" : p.status === "pending" ? "text-gold" : "text-destructive"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[10px]">{p.orderId}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {new Date(p.capturedAt ?? p.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payments.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No payments recorded yet. Payments appear when orders are created or Razorpay webhooks fire.</p>
        )}
      </section>
    </FounderShell>
  );
}
