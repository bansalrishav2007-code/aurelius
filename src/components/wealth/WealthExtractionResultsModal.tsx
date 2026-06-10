import { AlertTriangle, Check, Sparkles, X } from "lucide-react";
import { ASSET_CATEGORY_OPTIONS, LIABILITY_TYPE_OPTIONS } from "@/lib/wealth/categories";
import type { ExtractionFieldConfidence, WealthExtractionDraft } from "@/lib/wealth/types";

type Props = {
  open: boolean;
  draft: WealthExtractionDraft | null;
  saving?: boolean;
  onChange: (draft: WealthExtractionDraft) => void;
  onConfirm: () => void;
  onDiscard: () => void;
};

function ConfidenceBadge({ level }: { level?: ExtractionFieldConfidence }) {
  if (!level) return null;
  const styles =
    level === "high"
      ? "text-success border-success/30 bg-success/10"
      : level === "medium"
        ? "text-gold border-gold/30 bg-gold/10"
        : "text-amber-400 border-amber-400/30 bg-amber-400/10";
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider border ${styles}`}>
      {level === "high" ? <Check className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
      {level}
    </span>
  );
}

function fieldLevel(
  draft: WealthExtractionDraft,
  key: string,
  hasValue: boolean,
): ExtractionFieldConfidence {
  const fromAi = draft.fieldConfidence?.[key];
  if (fromAi) return fromAi;
  return hasValue ? "medium" : "low";
}

export function WealthExtractionResultsModal({ open, draft, saving, onChange, onConfirm, onDiscard }: Props) {
  if (!open || !draft) return null;

  const extractedCount =
    draft.assets.length +
    draft.liabilities.length +
    draft.legalEntities.length +
    (draft.taxSnapshot?.totalIncome != null || draft.taxSnapshot?.taxPaid != null ? 1 : 0);

  const needsReview =
    (draft.fieldConfidence ? Object.values(draft.fieldConfidence).filter((v) => v !== "high").length : 0) +
    draft.assets.filter((a) => !a.name || a.value <= 0).length +
    draft.liabilities.filter((l) => !l.name || l.value <= 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-label="Close" onClick={onDiscard} />
      <div className="relative w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto glass-strong rounded-t-2xl sm:rounded-2xl p-6 border border-border/60 shadow-luxury">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-lg">Document extraction results</h3>
            <p className="text-xs text-muted-foreground mt-1">{draft.documentName}</p>
          </div>
          <button type="button" onClick={onDiscard} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
            <Sparkles className="h-2.5 w-2.5" /> AI extracted
          </span>
          <span className="text-xs text-muted-foreground">
            {extractedCount} field{extractedCount !== 1 ? "s" : ""} extracted
            {needsReview > 0 && ` · ${needsReview} need review`}
          </span>
        </div>

        {draft.assets.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assets</p>
            {draft.assets.map((asset, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 rounded-lg border border-border/50 bg-background/40 p-2">
                <div className="space-y-1">
                  <input
                    className="field-input text-xs w-full"
                    value={asset.name}
                    onChange={(e) =>
                      onChange({ ...draft, assets: draft.assets.map((a, j) => (j === i ? { ...a, name: e.target.value } : a)) })
                    }
                  />
                  <ConfidenceBadge level={fieldLevel(draft, `asset.${i}.name`, !!asset.name)} />
                </div>
                <select
                  className="field-input text-xs"
                  value={asset.category}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      assets: draft.assets.map((a, j) =>
                        j === i ? { ...a, category: e.target.value as typeof a.category } : a,
                      ),
                    })
                  }
                >
                  {ASSET_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="space-y-1">
                  <input
                    className="field-input text-xs w-full"
                    type="number"
                    value={asset.value}
                    onChange={(e) =>
                      onChange({
                        ...draft,
                        assets: draft.assets.map((a, j) => (j === i ? { ...a, value: Number(e.target.value) || 0 } : a)),
                      })
                    }
                  />
                  <ConfidenceBadge level={fieldLevel(draft, `asset.${i}.value`, asset.value > 0)} />
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground self-start"
                  onClick={() => onChange({ ...draft, assets: draft.assets.filter((_, j) => j !== i) })}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {draft.liabilities.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Liabilities</p>
            {draft.liabilities.map((item, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 rounded-lg border border-border/50 bg-background/40 p-2">
                <div className="space-y-1">
                  <input
                    className="field-input text-xs w-full"
                    value={item.name}
                    onChange={(e) =>
                      onChange({
                        ...draft,
                        liabilities: draft.liabilities.map((l, j) => (j === i ? { ...l, name: e.target.value } : l)),
                      })
                    }
                  />
                  <ConfidenceBadge level={fieldLevel(draft, `liability.${i}.name`, !!item.name)} />
                </div>
                <select
                  className="field-input text-xs"
                  value={item.type}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      liabilities: draft.liabilities.map((l, j) =>
                        j === i ? { ...l, type: e.target.value as typeof l.type } : l,
                      ),
                    })
                  }
                >
                  {LIABILITY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="space-y-1">
                  <input
                    className="field-input text-xs w-full"
                    type="number"
                    value={item.value}
                    onChange={(e) =>
                      onChange({
                        ...draft,
                        liabilities: draft.liabilities.map((l, j) =>
                          j === i ? { ...l, value: Number(e.target.value) || 0 } : l,
                        ),
                      })
                    }
                  />
                  <ConfidenceBadge level={fieldLevel(draft, `liability.${i}.value`, item.value > 0)} />
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground self-start"
                  onClick={() => onChange({ ...draft, liabilities: draft.liabilities.filter((_, j) => j !== i) })}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {draft.legalEntities.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Legal entities</p>
            {draft.legalEntities.map((entity, i) => (
              <div key={i} className="grid sm:grid-cols-3 gap-2 rounded-lg border border-border/50 bg-background/40 p-2">
                <input
                  className="field-input text-xs"
                  value={entity.name}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      legalEntities: draft.legalEntities.map((en, j) => (j === i ? { ...en, name: e.target.value } : en)),
                    })
                  }
                />
                <input
                  className="field-input text-xs"
                  placeholder="Entity type"
                  value={entity.entityType ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      legalEntities: draft.legalEntities.map((en, j) =>
                        j === i ? { ...en, entityType: e.target.value } : en,
                      ),
                    })
                  }
                />
                <input
                  className="field-input text-xs"
                  type="number"
                  placeholder="Value (₹)"
                  value={entity.value ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      legalEntities: draft.legalEntities.map((en, j) =>
                        j === i ? { ...en, value: Number(e.target.value) || undefined } : en,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}

        {draft.taxSnapshot && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tax snapshot</p>
            <div className="grid sm:grid-cols-3 gap-2 rounded-lg border border-border/50 bg-background/40 p-2">
              <input
                className="field-input text-xs"
                placeholder="Assessment year"
                value={draft.taxSnapshot.assessmentYear ?? ""}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    taxSnapshot: { ...draft.taxSnapshot, assessmentYear: e.target.value },
                  })
                }
              />
              <input
                className="field-input text-xs"
                type="number"
                placeholder="Total income"
                value={draft.taxSnapshot.totalIncome ?? ""}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    taxSnapshot: { ...draft.taxSnapshot, totalIncome: Number(e.target.value) || undefined },
                  })
                }
              />
              <input
                className="field-input text-xs"
                type="number"
                placeholder="Tax paid"
                value={draft.taxSnapshot.taxPaid ?? ""}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    taxSnapshot: { ...draft.taxSnapshot, taxPaid: Number(e.target.value) || undefined },
                  })
                }
              />
            </div>
            <ConfidenceBadge level={fieldLevel(draft, "taxSnapshot", !!(draft.taxSnapshot.totalIncome || draft.taxSnapshot.taxPaid))} />
          </div>
        )}

        {extractedCount === 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            No fields were extracted automatically. Add entries manually or try pasting key figures.
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6 sticky bottom-0 bg-card/95 pt-2">
          <button type="button" onClick={onDiscard} disabled={saving} className="flex-1 h-10 rounded-xl border border-border text-sm">
            Discard
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-foreground text-background text-sm font-medium"
          >
            Confirm & save
          </button>
        </div>
      </div>
    </div>
  );
}
