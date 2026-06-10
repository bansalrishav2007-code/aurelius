import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Search, X } from "lucide-react";
import { FounderShell } from "@/components/founder/FounderShell";
import { fetchFounderOverview } from "@/lib/founder/client";
import { approveWaitlist, declineWaitlist } from "@/lib/auth/client";
import { updateWaitlistNotes } from "@/lib/founder/client";
import type { WaitlistApplication } from "@/lib/auth/types";

export const Route = createFileRoute("/_app/founder/applications")({
  head: () => ({ meta: [{ title: "Membership Applications — Founder" }] }),
  component: FounderApplicationsPage,
});

function FounderApplicationsPage() {
  const [waitlist, setWaitlist] = useState<WaitlistApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | WaitlistApplication["status"]>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  async function load() {
    const data = await fetchFounderOverview();
    setWaitlist(data.waitlist);
    const notes: Record<string, string> = {};
    for (const w of data.waitlist) {
      if (w.adminNotes) notes[w.id] = w.adminNotes;
    }
    setNotesDraft(notes);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return waitlist.filter((w) => {
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (!q) return true;
      return (
        w.fullName.toLowerCase().includes(q) ||
        w.email.toLowerCase().includes(q) ||
        w.profession.toLowerCase().includes(q)
      );
    });
  }, [waitlist, search, statusFilter]);

  async function handleApprove(id: string) {
    setLoading(true);
    try {
      await approveWaitlist(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline(id: string) {
    const reason = window.prompt("Optional rejection note for internal records:");
    if (reason === null) return;
    setLoading(true);
    try {
      await declineWaitlist(id, reason || undefined);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Decline failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveNotes(id: string) {
    const notes = notesDraft[id] ?? "";
    await updateWaitlistNotes(id, notes);
    await load();
  }

  return (
    <FounderShell title="Membership Applications" subtitle="Review verified applicants, approve or reject, and issue personal invite codes.">
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, profession…"
            className="w-full field-input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="field-input w-auto"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applications match your filters.</p>
        ) : (
          filtered.map((w) => (
            <div key={w.id} className="glass rounded-2xl overflow-hidden">
              <div className="p-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{w.fullName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{w.email} · {w.phone}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <EmailVerifiedBadge verifiedAt={w.emailVerifiedAt} />
                  <StatusBadge status={w.status} />
                  <button type="button" onClick={() => setExpandedId(expandedId === w.id ? null : w.id)} className="p-1 text-muted-foreground hover:text-foreground">
                    {expandedId === w.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {expandedId === w.id && (
                <div className="px-5 pb-5 border-t border-border/30 pt-4 space-y-4 text-sm">
                  <dl className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div><dt className="text-muted-foreground">Company</dt><dd className="mt-0.5">{w.company ?? "—"}</dd></div>
                    <div><dt className="text-muted-foreground">Email verified</dt><dd className="mt-0.5">{w.emailVerifiedAt ? new Date(w.emailVerifiedAt).toLocaleString() : "Not verified"}</dd></div>
                    <div><dt className="text-muted-foreground">Profession</dt><dd className="mt-0.5">{w.profession}</dd></div>
                    <div><dt className="text-muted-foreground">Primary concern</dt><dd className="mt-0.5">{w.wealthConcern ?? "—"}</dd></div>
                    <div><dt className="text-muted-foreground">Net worth</dt><dd className="mt-0.5">{w.netWorthBand ?? "—"}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-muted-foreground">Why access?</dt><dd className="mt-0.5 leading-relaxed">{w.whyAccess}</dd></div>
                    {w.inviteCode && (
                      <div className="sm:col-span-2 flex items-center gap-2">
                        <dt className="text-muted-foreground">Issued code</dt>
                        <code className="font-mono">{w.inviteCode}</code>
                        <button type="button" onClick={() => navigator.clipboard.writeText(w.inviteCode!)}><Copy className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </dl>

                  <div>
                    <label className="text-xs text-muted-foreground">Founder notes</label>
                    <textarea
                      value={notesDraft[w.id] ?? ""}
                      onChange={(e) => setNotesDraft((d) => ({ ...d, [w.id]: e.target.value }))}
                      rows={2}
                      className="field-input mt-1 resize-none"
                      placeholder="Internal notes about this applicant…"
                    />
                    <button type="button" onClick={() => saveNotes(w.id)} className="mt-2 text-xs text-gold hover:underline">
                      Save notes
                    </button>
                  </div>

                  {w.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleApprove(w.id)}
                        className="btn-primary btn-sm"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve & send invite
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleDecline(w.id)}
                        className="btn-secondary btn-sm text-muted-foreground hover:text-destructive hover:border-destructive/30"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </FounderShell>
  );
}

function EmailVerifiedBadge({ verifiedAt }: { verifiedAt?: string }) {
  if (!verifiedAt) {
    return <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-muted text-muted-foreground">Unverified</span>;
  }
  return (
    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-success/10 text-success inline-flex items-center gap-1">
      <Check className="h-3 w-3" /> Verified
    </span>
  );
}

function StatusBadge({ status }: { status: WaitlistApplication["status"] }) {
  const cls =
    status === "pending"
      ? "bg-gold/10 text-gold"
      : status === "approved"
        ? "bg-success/10 text-success"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${cls}`}>{status}</span>
  );
}
