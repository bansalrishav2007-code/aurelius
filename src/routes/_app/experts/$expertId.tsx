import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Star, Crown, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { ExpertAvatar } from "@/components/experts/ExpertAvatar";
import {
  confirmBookingPayment,
  createExpertBooking,
  fetchExpertDetail,
  payForBooking,
  type ExpertSlot,
  type PublicExpert,
} from "@/lib/experts/client";
import { formatInr } from "@/lib/experts/pricing";
import type { ExpertBooking } from "@/lib/experts/types";

export const Route = createFileRoute("/_app/experts/$expertId")({
  head: () => ({ meta: [{ title: "Expert Profile — Aurelius" }] }),
  component: ExpertDetailPage,
});

function ExpertDetailPage() {
  const { expertId } = Route.useParams();
  const [expert, setExpert] = useState<(PublicExpert & { listPrice?: string }) | null>(null);
  const [slots, setSlots] = useState<ExpertSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ExpertSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"select" | "pay" | "done">("select");
  const [booking, setBooking] = useState<ExpertBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchExpertDetail(expertId)
      .then((d) => {
        setExpert(d.expert);
        setSlots(d.slots);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load expert"))
      .finally(() => setLoading(false));
  }, [expertId]);

  async function handleBook() {
    if (!selectedSlot || !expert) return;
    setBusy(true);
    setError("");
    try {
      const { booking: created } = await createExpertBooking({
        expertId: expert.id,
        scheduledAt: selectedSlot.iso,
        notes,
      });
      setBooking(created);
      setStep("pay");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  async function handlePay() {
    if (!booking) return;
    setBusy(true);
    setError("");
    try {
      const order = await payForBooking(booking.id);
      await confirmBookingPayment(booking.id, order.orderId);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="p-10 text-sm text-muted-foreground">Loading expert profile…</p>;
  }

  if (!expert) {
    return (
      <div className="p-10">
        <p className="text-sm text-destructive">{error || "Expert not found."}</p>
        <Link to="/experts" className="text-xs text-gold mt-4 inline-block">
          ← Back to Experts
        </Link>
      </div>
    );
  }

  const slotsByDate = slots.reduce<Record<string, ExpertSlot[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="p-5 lg:p-10 max-w-[900px] mx-auto">
      <Link to="/experts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-3.5 w-3.5" />
        All experts
      </Link>

      <div className="glass rounded-2xl p-8 mb-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <ExpertAvatar name={expert.name} photoUrl={expert.photoUrl} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl tracking-tight">{expert.name}</h1>
              {expert.exclusiveOnly && <Crown className="h-4 w-4 text-gold" />}
            </div>
            <p className="text-muted-foreground mt-1">{expert.profession}</p>
            <p className="text-sm mt-3">{expert.specialization}</p>
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-gold text-gold" />
                {expert.rating.toFixed(1)} rating
              </span>
              <span>{expert.yearsExperience} years experience</span>
              <span>{expert.clientsServed} clients served</span>
              <span>{expert.languages.join(" · ")}</span>
            </div>
            {expert.bio && <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{expert.bio}</p>}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/40 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Consultation fee</p>
            <p className="font-display text-2xl text-gold mt-1">{expert.displayPrice}</p>
            {expert.discountPercent > 0 && expert.listPrice && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="line-through">{expert.listPrice}</span> · {expert.discountPercent}% member discount
              </p>
            )}
          </div>
          {expert.priorityBooking && (
            <span className="text-[10px] uppercase tracking-wider text-gold hairline rounded-full px-3 py-1.5">
              Priority booking
            </span>
          )}
        </div>
      </div>

      {step === "done" && booking ? (
        <div className="glass rounded-2xl p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
          <h2 className="font-display text-2xl mb-2">Booking confirmed</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your consultation with {expert.name} is scheduled. The expert will confirm shortly.
          </p>
          <div className="text-left max-w-sm mx-auto space-y-2 text-sm mb-8">
            <p>
              <span className="text-muted-foreground">Date:</span>{" "}
              {new Date(booking.scheduledAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
            </p>
            <p>
              <span className="text-muted-foreground">Paid:</span> {formatInr(booking.finalAmountPaise)}
            </p>
            <p>
              <span className="text-muted-foreground">Reference:</span> {booking.id}
            </p>
          </div>
          <Link to="/experts/bookings" className="inline-flex h-10 px-5 items-center rounded-lg bg-foreground text-background text-xs font-medium">
            View my bookings
          </Link>
        </div>
      ) : !expert.canBook ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Crown className="h-8 w-8 text-gold mx-auto mb-3" />
          <p className="font-medium">Exclusive expert</p>
          <p className="text-sm text-muted-foreground mt-2">
            This advisor is available to Founding Circle and Family Office members only.
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl p-8">
          <h2 className="font-display text-xl mb-1">
            {step === "select" ? "Select date & time" : "Complete payment"}
          </h2>
          <p className="text-xs text-muted-foreground mb-6">60-minute private consultation · Video-ready architecture</p>

          {error && <p className="text-xs text-destructive mb-4">{error}</p>}

          {step === "select" ? (
            <>
              {Object.keys(slotsByDate).length === 0 ? (
                <p className="text-sm text-muted-foreground">No available slots in the next two weeks.</p>
              ) : (
                <div className="space-y-6 mb-6">
                  {Object.entries(slotsByDate).map(([date, daySlots]) => (
                    <div key={date}>
                      <p className="text-xs font-medium mb-2">
                        {new Date(date).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {daySlots.map((s) => (
                          <button
                            key={s.iso}
                            onClick={() => setSelectedSlot(s)}
                            className={`h-9 px-3 rounded-lg text-xs transition-all ${
                              selectedSlot?.iso === s.iso
                                ? "bg-foreground text-background"
                                : "hairline hover:bg-muted/40"
                            }`}
                          >
                            {s.slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brief context for your consultation (optional)"
                className="w-full field-input min-h-[80px] mb-6 text-sm"
              />

              <button
                disabled={!selectedSlot || busy}
                onClick={handleBook}
                className="h-11 px-6 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                Reserve slot
              </button>
            </>
          ) : (
            booking && (
              <div>
                <div className="rounded-xl bg-muted/30 p-5 mb-6 text-sm space-y-2">
                  <p>
                    <span className="text-muted-foreground">Expert:</span> {expert.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">When:</span>{" "}
                    {new Date(booking.scheduledAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Amount:</span> {formatInr(booking.finalAmountPaise)}
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={handlePay}
                  className="h-11 px-6 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Pay consultation fee
                </button>
                <p className="text-[10px] text-muted-foreground mt-3">
                  Secure payment via Razorpay. Dev mode confirms automatically when keys are not configured.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
