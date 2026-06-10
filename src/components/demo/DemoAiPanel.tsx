import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { mockChatStarter } from "@/lib/mock-data";
import { DEMO_LOCK_CTA } from "@/lib/demo/messages";

type Msg = { id: string; role: "user" | "assistant"; content: string };

type DemoAiPanelProps = {
  clientName: string;
  quotaDaily: number;
};

function TypingIndicator() {
  return (
    <div className="demo-typing flex items-center gap-1 px-1 py-2" aria-label="Aurelius is composing a response">
      <span className="demo-typing__dot" />
      <span className="demo-typing__dot" />
      <span className="demo-typing__dot" />
    </div>
  );
}

export function DemoAiPanel({ clientName, quotaDaily }: DemoAiPanelProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const limitReached = quotaRemaining !== null && quotaRemaining <= 0;
  const remaining = quotaRemaining ?? quotaDaily;
  const quotaUsed = quotaDaily - remaining;
  const quotaPct = quotaDaily > 0 ? Math.round((remaining / quotaDaily) * 100) : 0;

  useEffect(() => {
    fetch("/api/chat/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { configured?: boolean; demo?: { quotaRemaining?: number } }) => {
        setAiReady(Boolean(d.configured));
        if (d.demo) setQuotaRemaining(d.demo.quotaRemaining ?? 0);
        else setQuotaRemaining(quotaDaily);
      })
      .catch(() => {
        setAiReady(false);
        setQuotaRemaining(quotaDaily);
      });
  }, [quotaDaily]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming || limitReached) return;

    if (aiReady === false) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "The intelligence desk is not configured in this environment. In production, Aurelius delivers counsel-grade analysis on Indian wealth, tax, and legal matters.",
        },
      ]);
      return;
    }

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          clientName,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        const code = (err as { code?: string }).code;
        if (code === "DEMO_AI_LIMIT") setQuotaRemaining(0);
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      if (quotaRemaining !== null) setQuotaRemaining(Math.max(0, quotaRemaining - 1));
      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
            const delta = json.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              acc += delta;
              setMessages((m) =>
                m.map((msg) => (msg.id === assistantId ? { ...msg, content: acc } : msg)),
              );
            }
          } catch {
            /* skip malformed chunks */
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to reach the intelligence desk.";
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId ? { ...msg, content: msg.content || message } : msg,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="demo-ai-desk flex flex-col min-h-[28rem] lg:min-h-[34rem]">
      <div className="demo-ai-desk__header px-6 py-5 border-b border-border/35 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="demo-ai-desk__emblem">
            <Sparkles className="h-4 w-4 text-gold" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg tracking-tight leading-none">Intelligence Desk</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.22em] mt-1.5">
              Private wealth · AI counsel
            </p>
          </div>
        </div>

        <div className="demo-quota-meter shrink-0" title={`${remaining} of ${quotaDaily} briefings remaining today`}>
          <div
            className="demo-quota-meter__ring"
            style={{ "--quota-pct": `${quotaPct}%` } as React.CSSProperties}
          >
            <span className="demo-quota-meter__value">{remaining}</span>
          </div>
          <div className="demo-quota-meter__label">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Today</span>
            <span className="text-[11px] font-mono tabular-nums text-gold/90">
              {remaining}/{quotaDaily}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 demo-ai-desk__thread">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              Your private intelligence desk for Indian wealth, tax, and legal structure. This preview includes{" "}
              <span className="text-foreground/90">{quotaDaily} counsel briefings</span> per day.
            </p>
            <div>
              <p className="demo-section-eyebrow mb-3">Suggested inquiries</p>
              <div className="flex flex-wrap gap-2">
                {mockChatStarter.slice(0, 3).map((starter, i) => (
                  <motion.button
                    key={starter}
                    type="button"
                    disabled={limitReached || streaming}
                    onClick={() => send(starter)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="demo-starter-chip"
                  >
                    {starter}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={msg.role === "user" ? "demo-msg demo-msg--user" : "demo-msg demo-msg--assistant"}
            >
              {msg.role === "assistant" && (
                <span className="demo-msg__label">Aurelius</span>
              )}
              {msg.content ? (
                <p className="demo-msg__body">{msg.content}</p>
              ) : streaming && msg.role === "assistant" ? (
                <TypingIndicator />
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {limitReached ? (
        <div className="demo-ai-limit px-6 py-5 border-t border-border/35">
          <p className="text-sm text-foreground/90 leading-relaxed">
            Today&apos;s preview briefings are complete ({quotaUsed}/{quotaDaily}).{" "}
            <Link to="/waitlist" className="text-gold hover:underline underline-offset-4 transition-colors">
              {DEMO_LOCK_CTA}
            </Link>{" "}
            to unlock unlimited intelligence counsel.
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="demo-ai-desk__composer px-6 py-5 border-t border-border/35 flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming || limitReached}
            placeholder="Ask about tax, structure, or portfolio intelligence…"
            className="field-input flex-1 h-11 demo-ai-input"
            aria-label="Message to intelligence desk"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming || limitReached}
            className="btn-primary h-11 px-5 shrink-0 demo-ai-send"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      )}
    </div>
  );
}
