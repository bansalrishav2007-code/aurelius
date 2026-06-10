import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LifeBuoy, MessageSquare, Plus } from "lucide-react";
import { PageHeader } from "@/components/client/PageHeader";
import { createMemberSupportTicket, fetchMemberSupport } from "@/lib/member/client";
import type { SupportTicket } from "@/lib/support/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/support")({
  head: () => ({ meta: [{ title: "Support Center — Aurelius" }] }),
  component: SupportPage,
});

function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  async function load() {
    const { tickets: list } = await fetchMemberSupport();
    setTickets(list);
    if (!selected && list[0]) setSelected(list[0]);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load support tickets."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      await createMemberSupportTicket({ subject: subject || "Support request", message });
      setSubject("");
      setMessage("");
      await load();
      toast.success("Your message has been sent to the private office.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-5 lg:p-10 max-w-[1440px] mx-auto">
      <PageHeader title="Support Center" subtitle="Contact the Aurelius private office — view replies and track open enquiries." />

      <div className="grid lg:grid-cols-5 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 glass rounded-2xl p-6 space-y-3 h-fit">
          <h2 className="font-display text-lg flex items-center gap-2">
            <Plus className="h-4 w-4" /> New enquiry
          </h2>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="field-input" />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we assist you?"
            required
            rows={5}
            className="field-input resize-none"
          />
          <button type="submit" disabled={loading} className="w-full h-10 rounded-xl bg-foreground text-background text-sm">
            {loading ? "Sending…" : "Submit enquiry"}
          </button>
        </form>

        <div className="lg:col-span-3 space-y-3">
          <h2 className="font-display text-lg flex items-center gap-2 mb-2">
            <LifeBuoy className="h-4 w-4 text-gold" /> Your tickets
          </h2>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground glass rounded-2xl p-6">No support tickets yet.</p>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t)}
                className={`w-full text-left glass rounded-xl p-4 transition-colors ${
                  selected?.id === t.id ? "border border-gold/25" : ""
                }`}
              >
                <div className="flex justify-between gap-2">
                  <p className="font-medium text-sm">{t.subject}</p>
                  <span className={`text-[10px] uppercase ${t.status === "open" ? "text-gold" : "text-success"}`}>{t.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{new Date(t.createdAt).toLocaleString()}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {selected && (
        <section className="glass rounded-2xl p-6 mt-6">
          <h3 className="font-display text-xl mb-2">{selected.subject}</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.message}</p>
          {selected.replies.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-border/30 pt-4">
              {selected.replies.map((r, i) => (
                <div key={i} className={`rounded-xl p-4 text-sm ${r.from === "founder" ? "bg-gold/10" : "panel-muted"}`}>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">
                    {r.from === "founder" ? "Private office" : "You"} · {new Date(r.at).toLocaleString()}
                  </p>
                  <p className="whitespace-pre-wrap">{r.message}</p>
                </div>
              ))}
            </div>
          )}
          {selected.replies.length === 0 && selected.status === "open" && (
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Awaiting response from the private office.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
