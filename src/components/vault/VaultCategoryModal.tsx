import { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import * as Progress from "@radix-ui/react-progress";
import { VAULT_UPLOAD_CATEGORIES } from "@/lib/vault/categories";
import type { VaultUploadCategory } from "@/lib/vault/categories";
import { categoryNeedsExpiry } from "@/lib/vault/expiry";
import type { DocumentAnalysis } from "@/lib/vault/types";
import { analyzeDocument } from "@/lib/platform/client";

type Props = {
  fileName: string;
  documentId: string;
  suggestedCategory?: string;
  onConfirm: (category: VaultUploadCategory, expiryDate?: string) => void;
  onClose: () => void;
  onAnalysisComplete?: (analysis: DocumentAnalysis) => void;
};

export function VaultCategoryModal({
  fileName,
  documentId,
  suggestedCategory,
  onConfirm,
  onClose,
  onAnalysisComplete,
}: Props) {
  const [category, setCategory] = useState<VaultUploadCategory>(
    (VAULT_UPLOAD_CATEGORIES.includes(suggestedCategory as VaultUploadCategory)
      ? suggestedCategory
      : "Other") as VaultUploadCategory,
  );
  const [expiryDate, setExpiryDate] = useState("");
  const [analysing, setAnalysing] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);

  const needsExpiry = categoryNeedsExpiry(category);

  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(() => {
      setAnalysisProgress((p) => Math.min(90, p + 12));
    }, 400);

    analyzeDocument(documentId)
      .then(({ analysis: result }) => {
        if (cancelled) return;
        setAnalysis(result);
        onAnalysisComplete?.(result);
        setAnalysisProgress(100);
      })
      .catch(() => {
        if (!cancelled) setAnalysis(null);
      })
      .finally(() => {
        if (!cancelled) setAnalysing(false);
      });

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [documentId, onAnalysisComplete]);

  const keyFacts = analysis?.keyFacts?.length
    ? analysis.keyFacts
    : analysis?.sections?.keyFigures
        ?.split("\n")
        .map((l) => l.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean) ?? [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl border border-[#c9a84c]/20 bg-[#0a0e1a] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="vault-category-title"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="vault-category-title" className="font-display text-lg text-foreground">
              Tag document
            </h2>
            <p className="text-xs text-muted-foreground mt-1 truncate">{fileName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {analysing ? (
          <div className="mb-6 rounded-xl bg-[#1a2035]/60 p-4">
            <div className="flex items-center gap-2 text-sm text-[#c9a84c] mb-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              🤖 Analysing document…
            </div>
            <Progress.Root
              value={analysisProgress}
              className="relative h-2 w-full overflow-hidden rounded-full bg-[#0a0e1a]"
            >
              <Progress.Indicator
                className="h-full bg-[#c9a84c] transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </Progress.Root>
          </div>
        ) : analysis && (
          <div className="mb-6 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-[#c9a84c]" />
              <p className="text-xs font-medium text-[#c9a84c]">AI extracted</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {analysis.summary || analysis.sections?.documentSummary}
            </p>
            {keyFacts.length > 0 && (
              <ul className="space-y-1">
                {keyFacts.slice(0, 5).map((fact, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground">
                    • {fact}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-3">
          Suggested category — confirm or change:
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {VAULT_UPLOAD_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`h-10 rounded-xl text-xs px-3 text-left transition-colors ${
                category === c
                  ? "bg-[#c9a84c]/15 border border-[#c9a84c]/50 text-[#c9a84c]"
                  : "border border-border/50 text-muted-foreground hover:border-[#c9a84c]/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {needsExpiry && (
          <div className="mb-4">
            <label className="text-xs text-muted-foreground block mb-2">
              Expiry date (required for insurance & property tax)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full h-10 rounded-xl border border-border/50 bg-[#1a2035] px-3 text-xs"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => onConfirm(category, needsExpiry ? expiryDate : undefined)}
          disabled={needsExpiry && !expiryDate}
          className="w-full h-11 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium hover:bg-[#c9a84c]/90 disabled:opacity-50"
        >
          Save & continue
        </button>
      </div>
    </div>
  );
}
