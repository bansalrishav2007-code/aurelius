import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Landmark,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AnimatedInr } from "./AnimatedInr";
import { formatInr } from "@/lib/wealth/calculations";
import {
  applyMaxDeductions,
  buildDeductionMaximiser,
  storeWealthPrefills,
  type DeductionSection,
  type DeductionSectionId,
} from "@/lib/wealth/deduction-maximiser";
import {
  LIMIT_80C,
  LIMIT_80CCD1B,
  LIMIT_80D,
  LIMIT_80D_SENIOR,
  LIMIT_HOME_LOAN,
  type TaxCalculatorInput,
  type TaxCalculatorResult,
} from "@/lib/wealth/tax-calculator";

type Props = {
  input: TaxCalculatorInput;
  result: TaxCalculatorResult;
  isDemo?: boolean;
  onPatchInput: (patch: Partial<TaxCalculatorInput>) => void;
  onShareWithExpert: (agenda: string) => void;
};

function DeductionCard({
  section,
  expanded,
  onToggle,
  onAction,
}: {
  section: DeductionSection;
  expanded: boolean;
  onToggle: () => void;
  onAction: () => void;
}) {
  const unclaimed = !section.fullyClaimed && section.remaining > 0;

  return (
    <div
      className={`rounded-xl border transition-colors ${
        section.fullyClaimed
          ? "border-emerald-400/30 bg-emerald-400/5"
          : unclaimed
            ? "border-[#c9a84c]/40 bg-[#c9a84c]/5"
            : "border-border/40 bg-card/20"
      }`}
    >
      <button type="button" onClick={onToggle} className="w-full text-left p-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {section.fullyClaimed && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
            <p className="text-sm font-medium">{section.title}</p>
            {section.subtitle && (
              <span className="text-[10px] text-muted-foreground">({section.subtitle})</span>
            )}
          </div>
          {section.limit != null ? (
            <p className="text-xs text-muted-foreground mt-1">
              Status: {formatInr(section.used)} used of {formatInr(section.limit)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Status: {section.fullyClaimed ? "Claimed" : "Not claimed"}
            </p>
          )}
          {section.remaining > 0 && section.limit != null && (
            <p className="text-xs text-[#c9a84c] mt-0.5">
              Remaining: {formatInr(section.remaining)} unclaimed
            </p>
          )}
          {section.taxSavingIfClaimed > 0 && (
            <p className="text-xs text-emerald-400/90 mt-1">
              Tax saving if claimed: {formatInr(section.taxSavingIfClaimed)}
            </p>
          )}
          {section.id === "hra" && !section.fullyClaimed && section.limit != null && (
            <p className="text-xs text-muted-foreground mt-1">
              Potential saving: up to {formatInr(section.taxSavingIfClaimed)} (estimate)
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">How to claim</p>
          <ul className="text-xs text-muted-foreground space-y-1.5 mb-4">
            {section.howToClaim.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-[#c9a84c]">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {!section.fullyClaimed && (
            <button
              type="button"
              onClick={onAction}
              className="text-xs text-[#c9a84c] hover:underline font-medium"
            >
              {section.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DeductionMaximiserSection({
  input,
  result,
  isDemo,
  onPatchInput,
  onShareWithExpert,
}: Props) {
  const navigate = useNavigate();
  const maximiser = useMemo(() => buildDeductionMaximiser(input, result), [input, result]);
  const [expandedId, setExpandedId] = useState<DeductionSectionId | null>("80c");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const hasIncome = result.totalGrossIncome > 0;

  if (!hasIncome) {
    return (
      <section className="glass rounded-2xl border border-border/40 p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-[#c9a84c]" />
          <h2 className="font-display text-lg text-[#c9a84c]">Deduction Maximiser</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter your income above to scan every deduction you can still claim.
        </p>
      </section>
    );
  }

  function handleSectionAction(section: DeductionSection) {
    const limit80D = input.isSenior ? LIMIT_80D_SENIOR : LIMIT_80D;
    switch (section.id) {
      case "80c":
        onPatchInput({ deduction80C: LIMIT_80C, extra80C: 0 });
        break;
      case "80d":
        onPatchInput({ deduction80D: limit80D, extra80D: 0 });
        break;
      case "80ccd1b":
        onPatchInput({ deduction80CCD1B: LIMIT_80CCD1B, extraNPS: 0 });
        break;
      case "24b":
        onPatchInput({ homeLoanInterest: LIMIT_HOME_LOAN });
        break;
      case "hra":
        if (input.salaryBusiness > 0) {
          const est = section.limit ?? 0;
          onPatchInput({ hraExemption: est });
        }
        break;
      default:
        break;
    }
  }

  function handleMaximise() {
    onPatchInput(applyMaxDeductions(input));
  }

  function handleAddToWealth() {
    storeWealthPrefills(maximiser.wealthPrefills);
    navigate({ to: "/dashboard/wealth-overview" });
  }

  const checklistDone = maximiser.checklist.filter((c) => checked.has(c.id)).length;
  const checklistSaving = maximiser.checklist
    .filter((c) => checked.has(c.id))
    .reduce((sum, c) => {
      const sec = maximiser.sections.find((s) => s.id === c.sectionId);
      return sum + (sec?.taxSavingIfClaimed ?? 0);
    }, 0);

  return (
    <section className="glass rounded-2xl border border-[#c9a84c]/25 p-5 lg:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-[#c9a84c]" />
          <h2 className="font-display text-xl text-[#c9a84c]">Deduction Maximiser</h2>
        </div>
        <p className="text-lg font-medium mt-3">
          You are leaving{" "}
          <span className="text-[#c9a84c]">
            <AnimatedInr value={maximiser.summary.leftOnTable} />
          </span>{" "}
          on the table.
        </p>
        <p className="text-sm text-muted-foreground">Here&apos;s every deduction you haven&apos;t claimed yet.</p>
      </div>

      <div className="rounded-2xl border border-[#c9a84c]/30 bg-[#0a0e1a]/80 p-5 lg:p-6">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">Total maximiser summary</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Current deductions</p>
            <p className="font-medium tabular-nums">{formatInr(maximiser.summary.currentDeductions)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Maximum possible</p>
            <p className="font-medium tabular-nums">{formatInr(maximiser.summary.maximumPossible)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gap</p>
            <p className="font-medium tabular-nums text-[#c9a84c]">{formatInr(maximiser.summary.gap)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tax you&apos;re paying</p>
            <p className="font-medium tabular-nums">{formatInr(maximiser.summary.currentTax)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Minimum possible</p>
            <p className="font-medium tabular-nums text-emerald-400">{formatInr(maximiser.summary.minimumPossibleTax)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">You could save</p>
            <p className="font-display text-xl text-[#c9a84c] tabular-nums">
              {formatInr(maximiser.summary.totalTaxSaving)}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Deductions claimed</span>
            <span className="text-[#c9a84c]">
              {maximiser.summary.claimedCount} of {maximiser.summary.applicableCount} · {maximiser.summary.progressPercent}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
            <div
              className="h-full bg-[#c9a84c] rounded-full transition-all"
              style={{ width: `${maximiser.summary.progressPercent}%` }}
            />
          </div>
        </div>

        <p className="font-display text-2xl lg:text-3xl text-[#c9a84c] text-center py-2">
          You could save {formatInr(maximiser.summary.totalTaxSaving)} more in taxes
        </p>

        <button
          type="button"
          onClick={handleMaximise}
          disabled={isDemo}
          className="w-full mt-4 h-11 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium hover:bg-[#c9a84c]/90 disabled:opacity-40"
        >
          Maximise my deductions
        </button>
      </div>

      <div className="rounded-xl border border-border/40 bg-card/20 p-4">
        <p className="text-sm font-medium mb-1">Regime recommendation</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{maximiser.regimeAfterMax.message}</p>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          <span>Old (max deductions): {formatInr(maximiser.regimeAfterMax.oldTax)}</span>
          <span>New (max deductions): {formatInr(maximiser.regimeAfterMax.newTax)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {maximiser.sections.map((section) => (
          <DeductionCard
            key={section.id}
            section={section}
            expanded={expandedId === section.id}
            onToggle={() => setExpandedId((id) => (id === section.id ? null : section.id))}
            onAction={() => handleSectionAction(section)}
          />
        ))}
      </div>

      {maximiser.checklist.length > 0 && (
        <div className="rounded-xl border border-border/40 p-5">
          <h3 className="font-display text-base mb-1">My deduction checklist FY 2025-26</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Progress: {checklistDone} of {maximiser.checklist.length} claimed · Potential saving locked:{" "}
            {formatInr(checklistSaving)} of {formatInr(maximiser.summary.totalTaxSaving)}
          </p>
          <ul className="space-y-3">
            {maximiser.checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked.has(item.id)}
                  onChange={() => {
                    setChecked((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    });
                  }}
                  className="mt-1 rounded accent-[#c9a84c]"
                />
                <div>
                  <p className="text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                  <p className="text-[10px] text-[#c9a84c]/80 mt-0.5">Deadline: {item.deadline}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={handleAddToWealth}
          disabled={isDemo || maximiser.wealthPrefills.length === 0}
          className="h-10 px-4 text-xs rounded-xl border border-[#c9a84c]/40 text-[#c9a84c] inline-flex items-center gap-2 hover:bg-[#c9a84c]/10 disabled:opacity-40"
        >
          <Landmark className="h-3.5 w-3.5" />
          Add these investments to Wealth Overview
        </button>
        <button
          type="button"
          onClick={() => onShareWithExpert(maximiser.expertAgenda)}
          disabled={isDemo}
          className="h-10 px-4 text-xs rounded-xl border border-border/50 inline-flex items-center gap-2 hover:bg-muted/30 disabled:opacity-40"
        >
          <UserRound className="h-3.5 w-3.5" />
          My CA will help me claim all of these
        </button>
        <Link
          to="/dashboard/experts"
          className="h-10 px-4 text-xs rounded-xl border border-border/50 inline-flex items-center gap-2 hover:bg-muted/30"
        >
          Book expert
        </Link>
      </div>

      <p className="text-[11px] text-muted-foreground/80 italic text-center">
        Deduction eligibility depends on your specific situation. Aurelius provides estimates for planning only. Consult
        your CA before filing.
      </p>
    </section>
  );
}
