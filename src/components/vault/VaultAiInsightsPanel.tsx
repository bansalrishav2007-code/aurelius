import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import type { DocumentAnalysis, VaultDocument } from "@/lib/vault/types";
import { analyzeDocument, askDocumentQuestion } from "@/lib/platform/client";
import { PrivateAiBadge } from "@/components/privacy/PrivateAiBadge";

type FollowUp = { role: "user" | "assistant"; content: string };

type Props = {
  doc: VaultDocument;
  onAnalysisComplete: (analysis: DocumentAnalysis) => void;
  compact?: boolean;
};

function InsightSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div className="h-3 w-24 bg-[#1a2035] rounded mb-2" />
          <div className="h-2 w-full bg-[#1a2035] rounded" />
          <div className="h-2 w-4/5 bg-[#1a2035] rounded mt-1.5" />
        </div>
      ))}
    </div>
  );
}

function SectionBlock({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-wider text-[#c9a84c] mb-2">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}

export function VaultAiInsightsPanel({ doc, onAnalysisComplete, compact }: Props) {
  const [analysis, setAnalysis] = useState<DocumentAnalysis | undefined>(doc.analysis);
  const [loading, setLoading] = useState(!doc.analysis);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const onCompleteRef = useRef(onAnalysisComplete);
  onCompleteRef.current = onAnalysisComplete;

  useEffect(() => {
    setAnalysis(doc.analysis);
    setFollowUps([]);
    if (!doc.analysis) {
      setLoading(true);
      analyzeDocument(doc.id)
        .then(({ analysis: result }) => {
          setAnalysis(result);
          onCompleteRef.current(result);
        })
        .catch(() => {
          setAnalysis({
            summary: "AI analysis is temporarily unavailable.",
            plainEnglish: "Please try again shortly.",
            complianceConcerns: [],
            discussionPoints: [],
            keyFacts: [],
            generatedAt: new Date().toISOString(),
          });
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [doc.id, doc.analysis]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    setQuestion("");
    setFollowUps((prev) => [...prev, { role: "user", content: q }]);
    setAsking(true);
    try {
      const { answer } = await askDocumentQuestion(doc.id, q);
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

  const sections = analysis?.sections;

  return (
    <div className={`flex flex-col bg-[#0a0e1a] ${compact ? "" : "h-full border-l border-[#1a2035]"}`}>
      <div className={`px-4 py-3 border-b border-[#1a2035] flex items-center gap-2 ${compact ? "" : "px-5 py-4"}`}>
        <Sparkles className="h-4 w-4 text-[#c9a84c]" />
        <h3 className={`font-display ${compact ? "text-sm" : "text-base"}`}>AI Insights</h3>
      </div>

      <div className={`flex-1 overflow-y-auto space-y-4 ${compact ? "px-4 py-3" : "px-5 py-4 space-y-5"}`}>
        {!compact && <PrivateAiBadge />}

        {loading ? (
          <InsightSkeleton />
        ) : sections ? (
          <>
            <SectionBlock title="Document Summary" body={sections.documentSummary} />
            <SectionBlock title="Key Figures Found" body={sections.keyFigures} />
            {!compact && (
              <>
                <SectionBlock title="Wealth Implications" body={sections.wealthImplications} />
                <SectionBlock title="Action Items" body={sections.actionItems} />
              </>
            )}
          </>
        ) : analysis ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{analysis.summary}</p>
        ) : null}

        {!compact &&
          followUps.map((msg, i) => (
            <div
              key={i}
              className={`text-xs rounded-xl px-3 py-2 ${
                msg.role === "user"
                  ? "bg-[#1a2035] text-foreground ml-4"
                  : "text-muted-foreground mr-4"
              }`}
            >
              {msg.content}
            </div>
          ))}
      </div>

      {!compact && (
        <form onSubmit={handleAsk} className="p-4 border-t border-[#1a2035]">
          <label className="text-[10px] text-muted-foreground mb-2 block">
            Ask a question about this document
          </label>
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What is my total tax liability?"
              className="flex-1 h-10 rounded-xl bg-[#1a2035] border border-border/40 px-3 text-xs text-foreground placeholder:text-muted-foreground"
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
      )}
    </div>
  );
}
