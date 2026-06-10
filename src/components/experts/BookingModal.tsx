import { useCallback, useEffect, useState } from "react";
import { X, CheckCircle2, Loader2, Calendar, Clock } from "lucide-react";
import { ExpertAvatar } from "@/components/experts/ExpertAvatar";
import {
  confirmBookingPayment,
  createExpertBooking,
  fetchExpertDetail,
  payForBooking,
  type CalendarDay,
  type DashboardExpert,
  type ExpertSlot,
} from "@/lib/experts/client";
import { BOOKING_DURATIONS, BOOKING_SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/experts/service-types";
import type { BookingDuration, BookingServiceType } from "@/lib/experts/service-types";
import type { ExpertBooking } from "@/lib/experts/types";

type Step = "service" | "datetime" | "agenda" | "confirm" | "done";

type Props = {
  expert: DashboardExpert;
  onClose: () => void;
  onBooked?: () => void;
};

export function BookingModal({ expert, onClose, onBooked }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [serviceType, setServiceType] = useState<BookingServiceType>("general_consultation");
  const [duration, setDuration] = useState<BookingDuration>(60);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [slots, setSlots] = useState<ExpertSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ExpertSlot | null>(null);
  const [agenda, setAgenda] = useState("");
  const [vaultShare, setVaultShare] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<ExpertBooking | null>(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchExpertDetail(expert.id, duration);
      setCalendar(data.calendar);
      setSlots(data.slots);
      if (!selectedDate && data.calendar[0]) setSelectedDate(data.calendar[0].date);
    } catch {
      setError("Could not load availability.");
    } finally {
      setLoading(false);
    }
  }, [expert.id, duration, selectedDate]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const daySlots = selectedDate
    ? calendar.find((d) => d.date === selectedDate)?.slots.filter((s) => s.slot !== "—") ?? []
    : [];

  async function handleConfirm() {
    if (!selectedSlot) return;
    setBusy(true);
    setError("");
    try {
      const { booking: created } = await createExpertBooking({
        expertId: expert.id,
        scheduledAt: selectedSlot.iso,
        durationMinutes: duration,
        serviceType,
        agenda: agenda.trim(),
        vaultBriefApproved: vaultShare,
      });
      const order = await payForBooking(created.id);
      await confirmBookingPayment(created.id, order.orderId);
      setBooking(created);
      setStep("done");
      onBooked?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  const whenLabel = selectedSlot
    ? new Date(selectedSlot.iso).toLocaleString("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border/50 bg-[#0a0e1a] shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-border/40 bg-[#0a0e1a]/95">
          <div className="flex items-center gap-3">
            <ExpertAvatar name={expert.name} photoUrl={expert.photoUrl} size="sm" />
            <div>
              <p className="font-display text-sm">{expert.name}</p>
              <p className="text-[10px] text-muted-foreground">{expert.specialization}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/30">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {step === "done" && booking ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="font-display text-xl mb-2">Booking request sent</h3>
              <p className="text-sm text-muted-foreground">
                Your request was sent to {expert.name}. You&apos;ll be notified when confirmed.
              </p>
              <p className="text-xs text-gold mt-2">Expected response: within 2 hours</p>
              <button type="button" onClick={onClose} className="mt-6 h-9 px-6 rounded-lg bg-[#c9a84c] text-[#0a0e1a] text-xs font-medium">
                Done
              </button>
            </div>
          ) : (
            <>
              {step === "service" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Service type</p>
                    <div className="space-y-2">
                      {BOOKING_SERVICE_TYPES.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name="service"
                            checked={serviceType === s.id}
                            onChange={() => setServiceType(s.id)}
                            className="accent-[#c9a84c]"
                          />
                          {s.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Duration</p>
                    <div className="flex gap-2">
                      {BOOKING_DURATIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDuration(d)}
                          className={`flex-1 h-9 rounded-lg text-xs ${duration === d ? "bg-[#c9a84c] text-[#0a0e1a]" : "hairline"}`}
                        >
                          {d} min
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={() => setStep("datetime")} className="w-full h-10 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium">
                    Continue
                  </button>
                </div>
              )}

              {step === "datetime" && (
                <div className="space-y-4">
                  {loading ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading slots…</p>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Select date (IST)
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {calendar.map((day) => {
                            const hasAvailable = day.slots.some((s) => s.status === "available");
                            return (
                              <button
                                key={day.date}
                                type="button"
                                disabled={!hasAvailable}
                                onClick={() => { setSelectedDate(day.date); setSelectedSlot(null); }}
                                className={`shrink-0 h-14 w-14 rounded-xl text-[10px] flex flex-col items-center justify-center ${
                                  selectedDate === day.date
                                    ? "bg-[#c9a84c] text-[#0a0e1a]"
                                    : hasAvailable
                                      ? "border border-emerald-500/40 text-emerald-400"
                                      : "border border-border/40 text-muted-foreground opacity-50"
                                }`}
                              >
                                <span>{new Date(day.date).toLocaleDateString("en-IN", { weekday: "short" })}</span>
                                <span className="font-medium">{new Date(day.date).getDate()}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {selectedDate && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Time slot
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {daySlots.map((s) => (
                              <button
                                key={s.iso}
                                type="button"
                                disabled={s.status !== "available"}
                                onClick={() => setSelectedSlot({ date: selectedDate, slot: s.slot, iso: s.iso })}
                                className={`h-8 px-3 rounded-lg text-xs ${
                                  s.status === "available"
                                    ? selectedSlot?.iso === s.iso
                                      ? "bg-foreground text-background"
                                      : "border border-emerald-500/40 text-emerald-400"
                                    : s.status === "booked"
                                      ? "hairline text-muted-foreground line-through"
                                      : "hairline text-muted-foreground opacity-40"
                                }`}
                              >
                                {s.slot}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setStep("service")} className="flex-1 h-10 rounded-xl hairline text-sm">Back</button>
                        <button
                          type="button"
                          disabled={!selectedSlot}
                          onClick={() => setStep("agenda")}
                          className="flex-1 h-10 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium disabled:opacity-40"
                        >
                          Continue
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === "agenda" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">What do you want to discuss?</p>
                    <textarea
                      value={agenda}
                      onChange={(e) => setAgenda(e.target.value.slice(0, 500))}
                      rows={4}
                      placeholder="e.g. FY25-26 tax optimisation and advance tax planning"
                      className="w-full field-input text-sm resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">{agenda.length}/500</p>
                  </div>
                  <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={vaultShare} onChange={(e) => setVaultShare(e.target.checked)} className="mt-0.5 accent-[#c9a84c]" />
                    Share wealth brief with expert before the session (recommended)
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStep("datetime")} className="flex-1 h-10 rounded-xl hairline text-sm">Back</button>
                    <button
                      type="button"
                      disabled={!agenda.trim()}
                      onClick={() => setStep("confirm")}
                      className="flex-1 h-10 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium disabled:opacity-40"
                    >
                      Review
                    </button>
                  </div>
                </div>
              )}

              {step === "confirm" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/40 p-4 space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Expert:</span> {expert.name}</p>
                    <p><span className="text-muted-foreground">Date:</span> {whenLabel}</p>
                    <p><span className="text-muted-foreground">Duration:</span> {duration} minutes</p>
                    <p><span className="text-muted-foreground">Service:</span> {SERVICE_TYPE_LABELS[serviceType]}</p>
                    <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">{agenda}</p>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStep("agenda")} className="flex-1 h-10 rounded-xl hairline text-sm">Back</button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleConfirm()}
                      className="flex-1 h-10 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium disabled:opacity-40"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Confirm Booking"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
