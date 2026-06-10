import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FileText, Loader2, Lock, Send, ShieldCheck } from "lucide-react";
import { PrivateAiBadge } from "@/components/privacy/PrivateAiBadge";
import {
  approveExpertVaultShare,
  fetchExpertChat,
  sendExpertChatMessage,
} from "@/lib/experts/client";
import type { ExpertChatThread } from "@/lib/experts/types";
import { fetchExpertDetail } from "@/lib/experts/client";

export const Route = createFileRoute("/_app/dashboard/experts/$expertId/chat")({
  head: () => ({ meta: [{ title: "Expert Chat — Aurelius" }] }),
  component: ExpertChatPage,
});

function ExpertChatPage() {
  const { expertId } = Route.useParams();
  const [expertName, setExpertName] = useState("");
  const [thread, setThread] = useState<ExpertChatThread | null>(null);
  const [vaultApproved, setVaultApproved] = useState(false);
  const [mainConcern, setMainConcern] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const [chat, detail] = await Promise.all([
      fetchExpertChat(expertId),
      fetchExpertDetail(expertId),
    ]);
    setThread(chat.thread);
    setVaultApproved(chat.vaultShareApproved);
    setExpertName(detail.expert.name);
  }

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [expertId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  async function handleShareVault() {
    await approveExpertVaultShare({ expertId, mainConcern: mainConcern || undefined });
    setVaultApproved(true);
    await load();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !thread || sending) return;
    setSending(true);
    try {
      const { thread: updated } = await sendExpertChatMessage(thread.id, input.trim());
      setThread(updated);
      setInput("");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p className="p-10 text-sm text-muted-foreground">Opening secure channel…</p>;
  }

  return (
    <div className="p-5 lg:p-10 max-w-[800px] mx-auto flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link
          to="/dashboard/experts/$expertId"
          params={{ expertId }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {expertName}
        </Link>
        <PrivateAiBadge compact />
      </div>

      {!vaultApproved && (
        <div className="glass rounded-xl p-4 mb-4 border border-gold/20">
          <p className="text-sm font-medium flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-gold" /> Share wealth brief with {expertName}?
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            The expert will see a one-line summary (net worth, main concern) — only if you approve. They cannot export your data.
          </p>
          <input
            className="field-input mt-3 text-sm"
            placeholder="Main concern (optional) — e.g. Bangalore property sale tax"
            value={mainConcern}
            onChange={(e) => setMainConcern(e.target.value)}
          />
          <button
            type="button"
            onClick={handleShareVault}
            className="mt-3 h-8 px-4 rounded-lg bg-foreground text-background text-xs"
          >
            Approve sharing
          </button>
        </div>
      )}

      <div className="flex-1 glass rounded-2xl p-4 overflow-y-auto space-y-3 min-h-0">
        {(thread?.messages ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            <ShieldCheck className="h-5 w-5 mx-auto mb-2 text-success/70" />
            Private encrypted channel with {expertName}. Messages are saved in your vault.
          </p>
        ) : (
          thread?.messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.sender === "member" ? "ml-auto bg-primary/15 hairline" : "bg-muted/30 hairline"
              }`}
            >
              {m.content}
              {m.documentIds?.length ? (
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {m.documentIds.length} document(s) shared
                </p>
              ) : null}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          className="field-input flex-1"
          placeholder="Message your expert…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={sending || !input.trim()} className="h-10 w-10 rounded-xl bg-foreground text-background grid place-items-center disabled:opacity-40">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
