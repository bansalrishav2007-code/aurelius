import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getAuthSession } from "@/lib/auth/session.functions";
import { useEffect, useState } from "react";
import { Calendar, Check, X, Clock, Users, MessageSquare, FileSignature, Video } from "lucide-react";
import { PageHeader } from "@/components/client/PageHeader";
import {
  fetchExpertAppointments,
  fetchExpertBookingBrief,
  fetchExpertClients,
  fetchExpertInbox,
  signExpertNda,
  updateExpertAppointment,
  updateExpertPortalAvailability,
} from "@/lib/experts/client";
import { SERVICE_TYPE_LABELS } from "@/lib/experts/service-types";
import type { ExpertChatThread, ExpertClientRelation } from "@/lib/experts/types";
import { formatInr } from "@/lib/experts/pricing";
import type { ExpertBooking, ExpertProfile } from "@/lib/experts/types";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/expert/")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (!session || session.role !== "EXPERT") {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Expert Portal — Aurelius" }] }),
  component: ExpertPortalPage,
});

const statusLabel: Record<ExpertBooking["status"], string> = {
  pending_payment: "Awaiting payment",
  pending_expert: "Needs your response",
  confirmed: "Confirmed",
  rejected: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
};

function ExpertPortalPage() {
  const { session } = AppRoute.useRouteContext();
  const [tab, setTab] = useState<"appointments" | "clients" | "inbox">("appointments");
  const [appointments, setAppointments] = useState<(ExpertBooking & { expertName: string })[]>([]);
  const [clients, setClients] = useState<(ExpertClientRelation & { brief?: string })[]>([]);
  const [inbox, setInbox] = useState<ExpertChatThread[]>([]);
  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [briefs, setBriefs] = useState<Record<string, string>>({});
  const [suggestId, setSuggestId] = useState<string | null>(null);
  const [suggestTime, setSuggestTime] = useState("");
  const [declineReason, setDeclineReason] = useState("");

  async function load() {
    const [data, clientData, inboxData] = await Promise.all([
      fetchExpertAppointments(),
      fetchExpertClients().catch(() => ({ clients: [] })),
      fetchExpertInbox().catch(() => ({ threads: [] })),
    ]);
    setAppointments(data.appointments);
    setExpert(data.expert);
    setClients(clientData.clients);
    setInbox(inboxData.threads);
  }

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(bookingId: string, status: "confirmed" | "rejected" | "completed", reason?: string) {
    setBusy(bookingId);
    try {
      await updateExpertAppointment(bookingId, { status, declineReason: reason });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy("");
    }
  }

  async function loadBrief(bookingId: string) {
    if (briefs[bookingId]) return;
    try {
      const { brief } = await fetchExpertBookingBrief(bookingId);
      setBriefs((prev) => ({ ...prev, [bookingId]: brief }));
    } catch {
      setBriefs((prev) => ({ ...prev, [bookingId]: "Brief unavailable." }));
    }
  }

  async function handleSuggestTime(bookingId: string) {
    if (!suggestTime) return;
    setBusy(bookingId);
    try {
      const iso = new Date(suggestTime).toISOString();
      await updateExpertAppointment(bookingId, {
        action: "suggest_time",
        suggestedTime: iso,
        declineReason: declineReason || undefined,
      });
      setSuggestId(null);
      setSuggestTime("");
      setDeclineReason("");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to suggest time");
    } finally {
      setBusy("");
    }
  }

  async function toggleBlockedDate(date: string) {
    if (!expert) return;
    const blocked = expert.availability.blockedDates.includes(date)
      ? expert.availability.blockedDates.filter((d) => d !== date)
      : [...expert.availability.blockedDates, date];
    const updated = await updateExpertPortalAvailability({ ...expert.availability, blockedDates: blocked });
    setExpert(updated.expert);
  }

  const upcomingDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="p-5 lg:p-10 max-w-[1000px] mx-auto">
      <PageHeader
        title="Expert portal"
        subtitle={`Welcome, ${session.fullName}. Manage appointments and availability for your Aurelius advisory practice.`}
      />

      {expert && !expert.ndaSignedAt && (
        <div className="glass rounded-2xl p-5 mb-8 border border-gold/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-gold" /> Expert NDA required
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sign digitally before accessing client briefs. You may not export or download client data.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signExpertNda();
              await load();
            }}
            className="h-9 px-4 rounded-lg bg-foreground text-background text-xs shrink-0"
          >
            Sign NDA
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <Link to="/expert/availability" className="h-9 px-4 rounded-full text-xs hairline inline-flex items-center">
          Manage availability
        </Link>
        {(["appointments", "clients", "inbox"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 h-9 rounded-full text-xs capitalize ${tab === t ? "bg-foreground text-background" : "hairline"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading portal…</p>
      ) : (
        <>
          {tab === "clients" && (
            <section className="mb-10 space-y-4">
              <h2 className="font-display text-xl flex items-center gap-2">
                <Users className="h-4 w-4" /> Your clients
              </h2>
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground glass rounded-2xl p-6">No assigned clients yet.</p>
              ) : (
                clients.map((c) => (
                  <div key={c.id} className="glass rounded-2xl p-5">
                    <p className="font-medium">{c.memberName}</p>
                    <p className="text-xs text-muted-foreground">{c.vaultShareApproved ? "Vault brief approved" : "Awaiting client approval"}</p>
                    {c.brief && expert?.ndaSignedAt && (
                      <p className="text-sm mt-3 p-3 rounded-lg bg-gold/5 border border-gold/15">{c.brief}</p>
                    )}
                  </div>
                ))
              )}
            </section>
          )}

          {tab === "inbox" && (
            <section className="mb-10 space-y-3">
              <h2 className="font-display text-xl flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Message inbox
              </h2>
              {inbox.length === 0 ? (
                <p className="text-sm text-muted-foreground glass rounded-2xl p-6">No messages yet.</p>
              ) : (
                inbox.map((t) => (
                  <div key={t.id} className="glass rounded-xl p-4">
                    <p className="font-medium text-sm">{t.memberName}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {t.messages[t.messages.length - 1]?.content ?? "No messages"}
                    </p>
                    {t.wealthBriefForExpert && expert?.ndaSignedAt && (
                      <p className="text-[11px] text-gold mt-2">{t.wealthBriefForExpert}</p>
                    )}
                  </div>
                ))
              )}
            </section>
          )}

          {tab === "appointments" && (
          <section className="mb-10">
            <h2 className="font-display text-xl mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointments
            </h2>
            {appointments.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
                No appointments yet.
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((a) => (
                  <div key={a.id} className="glass rounded-2xl p-6 border border-border/40">
                    {a.status === "pending_expert" && (
                      <p className="text-[10px] uppercase tracking-wider text-gold mb-3">New request</p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{a.memberName}</p>
                        <p className="text-xs text-muted-foreground">Tier {a.memberTier}</p>
                        <p className="text-sm mt-2">
                          {SERVICE_TYPE_LABELS[a.serviceType] ?? "Consultation"} · {a.durationMinutes} min
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(a.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                        </p>
                        {a.agenda && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/20 text-xs text-muted-foreground">
                            <p className="text-[10px] uppercase tracking-wider mb-1">Agenda</p>
                            {a.agenda}
                          </div>
                        )}
                        {(a.status === "pending_expert" || a.status === "confirmed") && expert?.ndaSignedAt && (
                          <button
                            type="button"
                            onClick={() => void loadBrief(a.id)}
                            className="text-[10px] text-gold mt-2 underline"
                          >
                            {briefs[a.id] ? "Refresh client brief" : "Load client wealth brief"}
                          </button>
                        )}
                        {briefs[a.id] && (
                          <p className="text-xs mt-2 p-3 rounded-lg bg-gold/5 border border-gold/15 whitespace-pre-wrap">{briefs[a.id]}</p>
                        )}
                        {a.aiBrief && a.status === "confirmed" && (
                          <div className="mt-3 p-3 rounded-lg border border-gold/20 bg-gold/5">
                            <p className="text-[10px] uppercase tracking-wider text-gold mb-1">Pre-meeting AI brief</p>
                            <p className="text-xs whitespace-pre-wrap">{a.aiBrief}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-gold">{formatInr(a.finalAmountPaise)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{statusLabel[a.status]}</p>
                      </div>
                    </div>

                    {a.status === "pending_expert" && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          disabled={busy === a.id}
                          onClick={() => handleAction(a.id, "confirmed")}
                          className="h-8 px-3 rounded-lg bg-foreground text-background text-xs inline-flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" /> Accept
                        </button>
                        <button
                          disabled={busy === a.id}
                          onClick={() => {
                            const reason = window.prompt("Decline reason (optional)") ?? "";
                            void handleAction(a.id, "rejected", reason || undefined);
                          }}
                          className="h-8 px-3 rounded-lg hairline text-xs inline-flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Decline
                        </button>
                        <button
                          disabled={busy === a.id}
                          onClick={() => setSuggestId(a.id)}
                          className="h-8 px-3 rounded-lg hairline text-xs"
                        >
                          Suggest new time
                        </button>
                      </div>
                    )}

                    {suggestId === a.id && (
                      <div className="mt-4 p-4 rounded-xl border border-border/40 space-y-2">
                        <input
                          type="datetime-local"
                          value={suggestTime}
                          onChange={(e) => setSuggestTime(e.target.value)}
                          className="w-full field-input text-xs"
                        />
                        <input
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          placeholder="Reason (optional)"
                          className="w-full field-input text-xs"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setSuggestId(null)} className="h-8 px-3 rounded-lg hairline text-xs">Cancel</button>
                          <button type="button" disabled={!suggestTime} onClick={() => void handleSuggestTime(a.id)} className="h-8 px-3 rounded-lg bg-foreground text-background text-xs">Send</button>
                        </div>
                      </div>
                    )}

                    {a.status === "confirmed" && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Link
                          to="/expert/join/$bookingId"
                          params={{ bookingId: a.id }}
                          className="h-8 px-3 rounded-lg bg-gold/15 text-gold text-xs inline-flex items-center gap-1"
                        >
                          <Video className="h-3 w-3" /> Join meeting
                        </Link>
                        {a.expertJoinCode && (
                          <span className="h-8 px-3 rounded-lg hairline text-xs inline-flex items-center font-mono">
                            Code: {a.expertJoinCode}
                          </span>
                        )}
                        <button
                          disabled={busy === a.id}
                          onClick={() => handleAction(a.id, "completed")}
                          className="h-8 px-3 rounded-lg hairline text-xs inline-flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" /> Mark completed
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
          )}

          {expert && tab === "appointments" && (
            <section>
              <h2 className="font-display text-xl mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Availability
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Block dates when you are unavailable. Weekly hours are set by the founder office.</p>
              <div className="flex flex-wrap gap-2">
                {upcomingDates.map((date) => {
                  const blocked = expert.availability.blockedDates.includes(date);
                  return (
                    <button
                      key={date}
                      onClick={() => toggleBlockedDate(date)}
                      className={`h-9 px-3 rounded-lg text-xs transition-all ${
                        blocked ? "bg-destructive/20 text-destructive hairline" : "hairline hover:bg-muted/40"
                      }`}
                    >
                      {new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
