import { useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { askVaultAssistant } from "@/lib/platform/client";
import type { VaultAskCitation } from "@/lib/vault/types";

type Props = {
  onClose: () => void;
  onOpenDocument?: (documentId: string) => void;
};

const SUGGESTIONS = [
  "What was my income last year?",
  "Do I have a trust deed?",
  "When does my insurance expire?",
];

export function VaultAssistantModal({ onClose, onOpenDocument }: Props) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<VaultAskCitation[]>([]);

  async function handleAsk(q?: string) {
    const text = (q ?? question).trim();
    if (!text || asking) return;
    setQuestion(text);
    setAsking(true);
    setAnswer(null);
    setCitations([]);
    try {
      const result = await askVaultAssistant(text);
      setAnswer(result.answer);
      setCitations(result.citations);
    } catch {
      setAnswer("AI assistant is temporarily unavailable. Please try again shortly.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[#c9a84c]/20 bg-[#0a0e1a] shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2035]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#c9a84c]" />
            <h2 className="font-display text-lg">Ask AI about your documents</h2>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void handleAsk(s)}
                className="text-[10px] px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:border-[#c9a84c]/40 hover:text-[#c9a84c]"
              >
                {s}
              </button>
            ))}
          </div>

          {asking && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-[#c9a84c]" />
              Searching your vault…
            </div>
          )}

          {answer && (
            <div className="rounded-xl bg-[#1a2035] p-4">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{answer}</p>
            </div>
          )}

          {citations.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Sources</p>
              <ul className="space-y-2">
                {citations.map((c) => (
                  <li key={c.documentId}>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDocument?.(c.documentId);
                        onClose();
                      }}
                      className="w-full text-left rounded-lg border border-border/40 px-3 py-2 hover:border-[#c9a84c]/40"
                    >
                      <p className="text-xs font-medium text-[#c9a84c]">{c.documentName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{c.excerpt}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleAsk();
          }}
          className="p-4 border-t border-[#1a2035] flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your vault…"
            className="flex-1 h-10 rounded-xl bg-[#1a2035] border border-border/40 px-3 text-xs"
            disabled={asking}
          />
          <button
            type="submit"
            disabled={asking || !question.trim()}
            className="h-10 w-10 rounded-xl bg-[#c9a84c] text-[#0a0e1a] flex items-center justify-center disabled:opacity-50"
          >
            {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
