import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { formatInr } from "@/lib/wealth/calculations";
import { adviseOnGoal, askGoalQuestion } from "@/lib/member/client";
import type { EnrichedGoal, GoalAiAdvice } from "@/lib/goals/types";
import { PrivateAiBadge } from "@/components/privacy/PrivateAiBadge";

type FollowUp = { role: "user" | "assistant"; content: string };

type Props = {
  goal: EnrichedGoal;
  open: boolean;
  onClose: () => void;
  onAdviceComplete?: (advice: GoalAiAdvice) => void;
};

function Section({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-wider text-[#c9a84c] mb-2">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i}>
          <div className="h-3 w-28 bg-[#1a2035] rounded mb-2" />
          <div className="h-2 w-full bg-[#1a2035] rounded" />
        </div>
      ))}
    </div>
  );
}

export function GoalAiDrawer({ goal, open, onClose, onAdviceComplete }: Props) {
  const [advice, setAdvice] = useState<GoalAiAdvice | undefined>(goal.aiAdvice);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const onCompleteRef = useRef(onAdviceComplete);
  onCompleteRef.current = onAdviceComplete;

  useEffect(() => {
    if (!open) return;
    setFollowUps([]);
    if (goal.aiAdvice) {
      setAdvice(goal.aiAdvice);
      setLoading(false);
      return;
    }
    setLoading(true);
    adviseOnGoal(goal.id)
      .then(({ advice: result }) => {
        setAdvice(result);
        onCompleteRef.current?.(result);
      })
      .catch(() => {
        setAdvice({
          realisticAssessment: "AI analysis is temporarily unavailable.",
          recommendedMonthly: "Please try again shortly.",
          bestInstruments: "",
          risks: "",
          sharpAdvice: "",
          generatedAt: new Date().toISOString(),
        });
      })
      .finally(() => setLoading(false));
  }, [open, goal.id, goal.aiAdvice]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    setQuestion("");
    setFollowUps((prev) => [...prev, { role: "user", content: q }]);
    setAsking(true);
    try {
      const { answer } = await askGoalQuestion(goal.id, q);
      setFollowUps((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch {
      setFollowUps((prev) => [
        ...prev,
        { role: "assistant", content: "AI is temporarily unavailable. Please try again shortly." },
      ]);
    } finally {
      setAsking(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        role="dialog"
        className="relative w-full max-w-md h-full overflow-hidden flex flex-col border-l border-[#1a2035] shadow-2xl animate-in slide-in-from-right duration-300"
        style={{ backgroundColor: "#0a0e1a" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-5 border-b border-[#1a2035] bg-[#0a0e1a]/95 backdrop-blur-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#c9a84c] shrink-0" />
              <h2 className="font-display text-lg truncate">AI Goal Advisor</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{goal.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-[#1a2035]/60 text-[10px] text-muted-foreground space-y-1">
          <p>Target: {goal.targetAmount ? formatInr(goal.targetAmount) : "—"}</p>
          <p>Current: {formatInr(goal.currentAmount ?? 0)} · {goal.progressPercent}% · {goal.monthsRemaining ?? "—"} months left</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <PrivateAiBadge />
          {loading ? (
            <Skeleton />
          ) : advice ? (
            <>
              <Section title="Realistic Assessment" body={advice.realisticAssessment} />
              <Section title="Recommended Monthly Amount" body={advice.recommendedMonthly} />
              <Section title="Best Instruments" body={advice.bestInstruments} />
              <Section title="Risks to Watch" body={advice.risks} />
              <Section title="Sharp Advice" body={advice.sharpAdvice} />
            </>
          ) : null}

          {followUps.map((msg, i) => (
            <div
              key={i}
              className={`text-xs rounded-xl px-3 py-2 ${
                msg.role === "user" ? "bg-[#1a2035] text-foreground ml-4" : "text-muted-foreground mr-4"
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>

        <form onSubmit={handleAsk} className="p-4 border-t border-[#1a2035]">
          <label className="text-[10px] text-muted-foreground mb-2 block">Follow-up question</label>
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Should I increase my SIP?"
              className="flex-1 h-10 rounded-xl bg-[#1a2035] border border-border/40 px-3 text-xs"
              disabled={asking || loading}
            />
            <button
              type="submit"
              disabled={asking || loading || !question.trim()}
              className="h-10 w-10 rounded-xl bg-[#c9a84c] text-[#0a0e1a] flex items-center justify-center disabled:opacity-50"
            >
              {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
