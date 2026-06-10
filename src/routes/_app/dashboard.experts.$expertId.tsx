import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Star, Calendar, CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import { ExpertAvatar } from "@/components/experts/ExpertAvatar";
import { PrivateAiBadge } from "@/components/privacy/PrivateAiBadge";
import {
  confirmBookingPayment,
  createExpertBooking,
  fetchExpertDetail,
  payForBooking,
  type ExpertSlot,
  type PublicExpert,
} from "@/lib/experts/client";
import { SPECIALISATION_LABELS, type ExpertSpecialisationTag } from "@/lib/experts/specialisations";
import type { ExpertBooking } from "@/lib/experts/types";

export const Route = createFileRoute("/_app/dashboard/experts/$expertId")({
  head: () => ({ meta: [{ title: "Expert Profile — Aurelius" }] }),
  component: DashboardExpertProfilePage,
});

function DashboardExpertProfilePage() {
  const { expertId } = Route.useParams();
  const [expert, setExpert] = useState<PublicExpert | null>(null);
  const [slots, setSlots] = useState<ExpertSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ExpertSlot | null>(null);
  const [agenda, setAgenda] = useState("");
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
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [expertId]);

  async function handleBook() {
    if (!selectedSlot || !expert || !agenda.trim()) {
      setError("Select a slot and add your agenda.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { booking: created } = await createExpertBooking({
        expertId: expert.id,
        scheduledAt: selectedSlot.iso,
        agenda: agenda.trim(),
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

  if (loading) return <p className="p-10 text-sm text-muted-foreground">Loading…</p>;
  if (!expert) {
    return (
      <div className="p-10">
        <p className="text-destructive text-sm">{error || "Expert not found."}</p>
        <Link to="/dashboard/experts" className="text-xs text-gold mt-4 inline-block">← Back</Link>
      </div>
    );
  }

  const slotsByDate = slots.reduce<Record<string, ExpertSlot[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  const tags = (expert as PublicExpert & { specialisationTags?: string[] }).specialisationTags ?? [];

  return (
    <div className="p-5 lg:p-10 max-w-[960px] mx-auto space-y-8">
      <Link to="/dashboard/experts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All experts
      </Link>

      <section className="glass rounded-2xl p-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <ExpertAvatar name={expert.name} photoUrl={expert.photoUrl} size="lg" />
          <div className="flex-1">
            <h1 className="font-display text-3xl">{expert.name}</h1>
            <p className="text-muted-foreground mt-1">{expert.profession}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag) => (
                <span key={tag} className="text-[10px] hairline rounded-full px-2 py-1 text-gold">
                  {SPECIALISATION_LABELS[tag as ExpertSpecialisationTag] ?? tag}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{expert.rating.toFixed(1)}</span>
              <span>{expert.yearsExperience} years</span>
              <span>{expert.languages.join(" · ")}</span>
            </div>
            {expert.bio && <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{expert.bio}</p>}
            {expert.expertiseAreas && expert.expertiseAreas.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Areas of expertise</p>
                <ul className="text-sm space-y-1">
                  {expert.expertiseAreas.map((area) => (
                    <li key={area}>· {area}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Link
            to="/dashboard/experts/$expertId/chat"
            params={{ expertId }}
            className="h-9 px-4 rounded-lg hairline text-xs inline-flex items-center gap-2"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Message
          </Link>
        </div>
      </section>

      {(expert.reviews ?? []).length > 0 && (
        <section className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Client reviews</h2>
          <div className="space-y-4">
            {expert.reviews!.map((r) => (
              <blockquote key={r.id} className="rounded-xl border border-border/50 p-4 text-sm">
                <div className="flex items-center gap-1 text-gold text-xs mb-2">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-gold" />
                  ))}
                  <span className="text-muted-foreground ml-2">Anonymous principal · {r.date}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{r.comment}</p>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {step === "done" && booking ? (
        <section className="glass rounded-2xl p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
          <h2 className="font-display text-2xl mb-2">Consultation booked</h2>
          <p className="text-sm text-muted-foreground mb-2">
            {expert.name} · {new Date(booking.scheduledAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
          </p>
          <p className="text-xs text-muted-foreground">Confirmation sent in-app and by email. Reminder 30 minutes before your call.</p>
          <PrivateAiBadge className="justify-center mt-4" />
        </section>
      ) : (
        <section className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gold" /> Book a consultation
          </h2>

          {!expert.canBook ? (
            <p className="text-sm text-gold">This expert is exclusive to premium members.</p>
          ) : step === "select" ? (
            <div className="space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(slotsByDate).map(([date, daySlots]) => (
                  <div key={date}>
                    <p className="text-xs text-muted-foreground mb-2">
                      {new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {daySlots.map((s) => (
                        <button
                          key={s.iso}
                          type="button"
                          onClick={() => setSelectedSlot(s)}
                          className={`h-8 px-3 rounded-lg text-xs ${selectedSlot?.iso === s.iso ? "bg-foreground text-background" : "hairline"}`}
                        >
                          {s.slot}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {slots.length === 0 && <p className="text-sm text-muted-foreground">No slots available this fortnight.</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Agenda / topic for this call</label>
                <textarea
                  className="field-input mt-1 resize-none"
                  rows={3}
                  placeholder="e.g. Review my tax position before property sale, HUF structuring…"
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                type="button"
                disabled={busy || !selectedSlot}
                onClick={handleBook}
                className="h-10 px-6 rounded-xl bg-foreground text-background text-sm disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Reserve slot"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">Complete booking for your selected slot. Aurelius handles billing separately.</p>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button type="button" disabled={busy} onClick={handlePay} className="h-10 px-6 rounded-xl bg-foreground text-background text-sm">
                {busy ? "Processing…" : "Confirm booking"}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
