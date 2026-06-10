import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, MessageSquare, Search } from "lucide-react";
import { FounderShell } from "@/components/founder/FounderShell";
import { fetchFounderOverview, replySupportTicket, setSupportTicketStatus } from "@/lib/founder/client";
import type { SupportTicket } from "@/lib/support/types";

export const Route = createFileRoute("/_app/founder/support")({
  head: () => ({ meta: [{ title: "Support — Founder" }] }),
  component: FounderSupportPage,
});

function FounderSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await fetchFounderOverview();
    setTickets(data.support);
    if (!selectedId && data.support[0]) setSelectedId(data.support[0].id);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.message.toLowerCase().includes(q)
      );
    });
  }, [tickets, search, statusFilter]);

  const selected = tickets.find((t) => t.id === selectedId) ?? filtered[0];

  async function handleReply() {
    if (!selected || !reply.trim()) return;
    setLoading(true);
    try {
      await replySupportTicket(selected.id, reply.trim());
      setReply("");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Reply failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(ticket: SupportTicket) {
    setLoading(true);
    try {
      await setSupportTicketStatus(ticket.id, ticket.status === "open" ? "resolved" : "open");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FounderShell title="Customer support" subtitle="Contact form submissions and customer queries — reply and resolve tickets.">
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets…" className="w-full field-input pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="field-input w-auto">
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-2 max-h-[600px] overflow-y-auto">
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left p-4 rounded-xl transition-colors ${
                selected?.id === t.id ? "glass border border-gold/20" : "panel-muted hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium truncate">{t.subject}</p>
                <span className={`text-[10px] uppercase shrink-0 ${t.status === "open" ? "text-gold" : "text-success"}`}>{t.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">{t.name} · {t.email}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(t.createdAt).toLocaleString()}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No tickets found.</p>}
        </div>

        {selected && (
          <div className="lg:col-span-3 glass rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-xl">{selected.subject}</h2>
                <p className="text-xs text-muted-foreground mt-1">{selected.name} · {selected.email}</p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => toggleStatus(selected)}
                className="text-xs hairline px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
              >
                <Check className="h-3 w-3" />
                Mark {selected.status === "open" ? "resolved" : "open"}
              </button>
            </div>

            <div className="panel-muted rounded-xl p-4 text-sm mb-4">
              <p className="text-xs text-muted-foreground mb-2">Original message</p>
              <p className="leading-relaxed whitespace-pre-wrap">{selected.message}</p>
            </div>

            {selected.replies.length > 0 && (
              <div className="space-y-3 mb-4">
                {selected.replies.map((r, i) => (
                  <div key={i} className={`rounded-xl p-4 text-sm ${r.from === "founder" ? "bg-gold/10 border border-gold/15" : "panel-muted"}`}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      {r.from === "founder" ? "Founder reply" : "Customer"} · {new Date(r.at).toLocaleString()}
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap">{r.message}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply to the customer…"
                rows={3}
                className="field-input flex-1 resize-none"
              />
              <button
                type="button"
                disabled={loading || !reply.trim()}
                onClick={handleReply}
                className="h-auto px-4 rounded-xl bg-foreground text-background text-sm shrink-0 inline-flex items-center gap-2 self-end"
              >
                <MessageSquare className="h-4 w-4" /> Send
              </button>
            </div>
          </div>
        )}
      </div>
    </FounderShell>
  );
}
