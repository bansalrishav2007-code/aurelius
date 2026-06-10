import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FolderLock,
  Lightbulb,
  Share2,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { InrInput } from "@/components/client/InrInput";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { formatInrInput, parseInrInput } from "@/lib/format-inr-input";
import { PrivateAiBadge } from "@/components/privacy/PrivateAiBadge";
import { AnimatedInr } from "@/components/tax-calculator/AnimatedInr";
import { DeductionMaximiserSection } from "@/components/tax-calculator/DeductionMaximiser";
import { DeductionTracker } from "@/components/tax-calculator/DeductionTracker";
import { TaxActionPlanSection } from "@/components/tax-calculator/TaxActionPlan";
import { TaxRegimeCard } from "@/components/tax-calculator/TaxRegimeCard";
import { TdsSection } from "@/components/tax-calculator/TdsSection";
import { IntroductionRequestModal } from "@/components/experts/directory/IntroductionRequestModal";
import {
  fetchDashboardExperts,
  type DashboardExpert,
} from "@/lib/experts/client";
import { fetchWealthOverview } from "@/lib/member/client";
import { formatInr } from "@/lib/wealth/calculations";
import {
  computeTax,
  defaultTaxInput,
  FY_LABEL,
  taxPdfFileName,
  LIMIT_80C,
  LIMIT_80CCD1B,
  LIMIT_80D,
  LIMIT_80D_SENIOR,
  taxInputFromSnapshot,
  type TaxCalculatorInput,
} from "@/lib/wealth/tax-calculator";
import { buildDeductionLedger, computeTdsReconciliation } from "@/lib/wealth/tax-deduction-ledger";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/dashboard/tax-calculator")({
  head: () => ({ meta: [{ title: `Tax Calculator — Aurelius` }] }),
  component: TaxCalculatorPage,
});

function IncomeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [display, setDisplay] = useState(() => (value > 0 ? formatInrInput(value) : ""));

  useEffect(() => {
    setDisplay(value > 0 ? formatInrInput(value) : "");
  }, [value]);

  return (
    <InrInput
      label={label}
      value={display}
      onChange={(next) => {
        setDisplay(next);
        const amount = parseInrInput(next);
        onChange(Number.isFinite(amount) ? Math.max(0, amount) : 0);
      }}
      placeholder="₹0"
    />
  );
}

function TaxCalculatorPage() {
  const { session } = AppRoute.useRouteContext();
  const isDemo = session.isDemo === true;

  const [loading, setLoading] = useState(true);
  const [prefilled, setPrefilled] = useState(false);
  const [input, setInput] = useState<TaxCalculatorInput>(defaultTaxInput());
  const [saving, setSaving] = useState(false);
  const [caExpert, setCaExpert] = useState<DashboardExpert | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [shareMessageOverride, setShareMessageOverride] = useState<string | null>(null);
  const [showSnapshotPrompt, setShowSnapshotPrompt] = useState(false);

  const patch = useCallback((p: Partial<TaxCalculatorInput>) => {
    setInput((prev) => ({ ...prev, ...p }));
  }, []);

  useEffect(() => {
    fetchWealthOverview()
      .then((data) => {
        const snap = data.profile?.taxSnapshot;
        if (snap) {
          setInput((prev) => ({ ...prev, ...taxInputFromSnapshot(snap) }));
          setPrefilled(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const result = useMemo(() => computeTax(input), [input]);
  const ledger = useMemo(() => buildDeductionLedger(input, result), [input, result]);
  const tds = useMemo(() => computeTdsReconciliation(input, result), [input, result]);
  const totalDeductionTaxSaved = useMemo(() => {
    const base = computeTax({
      ...input,
      deduction80C: 0,
      deduction80D: 0,
      deduction80CCD1B: 0,
      hraExemption: 0,
      homeLoanInterest: 0,
      deduction80TTA: 0,
      otherDeductions: 0,
      extra80C: 0,
      extra80D: 0,
      extraNPS: 0,
    });
    return Math.max(0, Math.round(base.old.totalTax - result.old.totalTax));
  }, [input, result.old.totalTax]);

  const whatIfSaved = useMemo(() => {
    const base = computeTax({ ...input, extra80C: 0, extraNPS: 0, extra80D: 0 });
    return Math.max(0, Math.round(base.old.totalTax - result.old.totalTax));
  }, [input, result.old.totalTax]);

  async function postAction(
    action: "save_vault" | "save_snapshot" | "download_pdf" | "save_plan_vault" | "download_plan_pdf",
  ) {
    setSaving(true);
    try {
      const res = await fetch("/api/member/tax-calculator", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, input }),
      });

      if (action === "download_pdf" || action === "download_plan_pdf") {
        if (!res.ok) throw new Error("PDF export failed.");
        const contentType = res.headers.get("Content-Type") ?? "";
        if (!contentType.includes("pdf")) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? "PDF export failed.");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          action === "download_plan_pdf"
            ? `Aurelius_Tax_Action_Plan_${FY_LABEL.replace(/\s/g, "_")}.pdf`
            : taxPdfFileName(session.fullName);
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(
          action === "download_pdf" && !isDemo
            ? "Tax report downloaded and saved to your vault."
            : "Tax report downloaded.",
        );
        setShowSnapshotPrompt(true);
        return;
      }

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      toast.success(data.message ?? "Done.");
      if (action === "save_vault") setShowSnapshotPrompt(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleShareWithExpert(agenda?: string) {
    try {
      const { experts } = await fetchDashboardExperts({ specialty: "tax" });
      const expert = experts[0];
      if (!expert) {
        toast.error("No CA expert available. Visit Experts to request one.");
        return;
      }
      setShareMessageOverride(agenda ?? null);
      setCaExpert(expert);
      setShowShare(true);
    } catch {
      toast.error("Unable to load experts.");
    }
  }

  const shareMessage = useMemo(() => {
    if (shareMessageOverride) return shareMessageOverride;
    const regime = result.winningRegime === "old" ? "Old" : "New";
    return `Please review my ${FY_LABEL} tax estimate from Aurelius. Gross income ${formatInr(result.totalGrossIncome)}, recommended ${regime} regime, estimated liability ${formatInr(Math.round(result.winningRegime === "old" ? result.old.totalTax : result.new.totalTax))}.`;
  }, [result, shareMessageOverride]);

  if (loading) {
    return (
      <div className="p-5 lg:p-10 max-w-[1400px] mx-auto min-w-0">
        <PageSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-10 max-w-[1400px] mx-auto min-w-0 space-y-8">
      <PageHeader title="Advanced Tax Calculator" subtitle={`${FY_LABEL} · Old vs new regime · Real-time estimates`}>
        <PrivateAiBadge />
      </PageHeader>

      {prefilled && (
        <p className="text-xs text-[#c9a84c]/90 border border-[#c9a84c]/25 rounded-lg px-4 py-2.5 bg-[#c9a84c]/5">
          Pre-filled from your vault / wealth data — edit any field before calculating.
        </p>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section className="glass rounded-2xl border border-border/40 p-5 lg:p-6 space-y-4">
            <h2 className="font-display text-lg text-[#c9a84c]">Primary income</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <IncomeField label="Salary / business income (₹)" value={input.salaryBusiness} onChange={(v) => patch({ salaryBusiness: v })} />
              <IncomeField label="Rental income (₹)" value={input.rental} onChange={(v) => patch({ rental: v })} />
              <IncomeField label="STCG (₹)" value={input.stcg} onChange={(v) => patch({ stcg: v })} />
              <IncomeField label="LTCG (₹)" value={input.ltcg} onChange={(v) => patch({ ltcg: v })} />
              <IncomeField label="Interest — FD, savings (₹)" value={input.interest} onChange={(v) => patch({ interest: v })} />
              <IncomeField label="Dividend income (₹)" value={input.dividend} onChange={(v) => patch({ dividend: v })} />
              <IncomeField label="Other income (₹)" value={input.other} onChange={(v) => patch({ other: v })} />
            </div>
          </section>

          <section className="glass rounded-2xl border border-border/40 p-5 lg:p-6 space-y-4">
            <h2 className="font-display text-lg text-[#c9a84c]">Deductions (old regime)</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <IncomeField label={`80C (max ${formatInr(LIMIT_80C)})`} value={input.deduction80C} onChange={(v) => patch({ deduction80C: v })} />
              <IncomeField
                label={`80D health (max ${formatInr(input.isSenior ? LIMIT_80D_SENIOR : LIMIT_80D)})`}
                value={input.deduction80D}
                onChange={(v) => patch({ deduction80D: v })}
              />
              <IncomeField label={`80CCD(1B) NPS (max ${formatInr(LIMIT_80CCD1B)})`} value={input.deduction80CCD1B} onChange={(v) => patch({ deduction80CCD1B: v })} />
              <IncomeField label="HRA exemption (₹)" value={input.hraExemption} onChange={(v) => patch({ hraExemption: v })} />
              <IncomeField label="Home loan interest 24(b) (max ₹2L)" value={input.homeLoanInterest} onChange={(v) => patch({ homeLoanInterest: v })} />
              <IncomeField label="80TTA savings interest (max ₹10K)" value={input.deduction80TTA} onChange={(v) => patch({ deduction80TTA: v })} />
              <IncomeField label="Other deductions (₹)" value={input.otherDeductions} onChange={(v) => patch({ otherDeductions: v })} />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={input.isSenior} onChange={(e) => patch({ isSenior: e.target.checked })} className="rounded" />
              Senior citizen (higher 80D limit)
            </label>
            <p className="text-[11px] text-muted-foreground">Standard deduction ₹50,000 applied automatically for salaried income.</p>
          </section>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl border border-[#c9a84c]/30 p-5 lg:p-6 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Regime comparison</p>
            <p className="font-display text-2xl lg:text-3xl text-[#c9a84c]">
              {result.winningRegime === "new" ? "New Regime" : "Old Regime"} saves you{" "}
              <AnimatedInr value={Math.round(result.savings)} />
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Gross income <AnimatedInr value={Math.round(result.totalGrossIncome)} className="text-foreground" />
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <TaxRegimeCard result={result.old} isWinner={result.winningRegime === "old"} label="Old Regime" />
            <TaxRegimeCard result={result.new} isWinner={result.winningRegime === "new"} label="New Regime" />
          </div>
        </div>
      </div>

      <DeductionTracker
        ledger={ledger}
        input={input}
        totalTaxSaved={totalDeductionTaxSaved}
        onPatch={patch}
      />

      <TdsSection input={input} tds={tds} onPatch={patch} />

      <DeductionMaximiserSection
        input={input}
        result={result}
        isDemo={isDemo}
        onPatchInput={patch}
        onShareWithExpert={(agenda) => handleShareWithExpert(agenda)}
      />

      <section className="glass rounded-2xl border border-border/40 p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-4 w-4 text-[#c9a84c]" />
          <h2 className="font-display text-lg">AI insights</h2>
          <Sparkles className="h-3.5 w-3.5 text-[#c9a84c]/70" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {result.insights.map((insight) => (
            <div key={insight.id} className="rounded-xl border border-border/30 p-4 bg-card/20">
              <p className="text-sm font-medium text-foreground">{insight.title}</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{insight.action}</p>
              <div className="flex items-center justify-between mt-3 text-[11px]">
                <span className="text-[#c9a84c]/80">{insight.section}</span>
                {insight.taxSaved > 0 && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Save {formatInr(insight.taxSaved)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {result.advanceTaxRequired && (
        <section className="glass rounded-2xl border border-border/40 p-5 lg:p-6">
          <h2 className="font-display text-lg mb-4">Advance tax schedule</h2>
          {result.nextAdvanceDue && (
            <p className="text-sm text-[#c9a84c] mb-4">
              Next advance tax payment of {formatInr(result.nextAdvanceDue.amount)} due in {result.nextAdvanceDue.daysUntil} days (
              {result.nextAdvanceDue.label})
            </p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {result.advanceTax.map((inst) => (
              <div key={inst.label} className="rounded-xl border border-border/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">{inst.label}</p>
                <p className="text-lg font-display text-[#c9a84c] mt-1">{formatInr(inst.amount)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{Math.round(inst.cumulativePercent * 100)}% cumulative</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="glass rounded-2xl border border-border/40 p-5 lg:p-6 space-y-5">
        <h2 className="font-display text-lg">What-if simulator</h2>
        <p className="text-xs text-muted-foreground">Adjust additional investments — tax updates in real time.</p>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span>Additional 80C investment</span>
              <span className="text-[#c9a84c]">{formatInr(input.extra80C ?? 0)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={LIMIT_80C}
              step={5000}
              value={input.extra80C ?? 0}
              onChange={(e) => patch({ extra80C: Number(e.target.value) })}
              className="w-full accent-[#c9a84c]"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span>Additional NPS (80CCD 1B)</span>
              <span className="text-[#c9a84c]">{formatInr(input.extraNPS ?? 0)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={LIMIT_80CCD1B}
              step={5000}
              value={input.extraNPS ?? 0}
              onChange={(e) => patch({ extraNPS: Number(e.target.value) })}
              className="w-full accent-[#c9a84c]"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span>Additional health insurance (80D)</span>
              <span className="text-[#c9a84c]">{formatInr(input.extra80D ?? 0)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={input.isSenior ? LIMIT_80D_SENIOR : LIMIT_80D}
              step={1000}
              value={input.extra80D ?? 0}
              onChange={(e) => patch({ extra80D: Number(e.target.value) })}
              className="w-full accent-[#c9a84c]"
            />
          </div>
        </div>

        {(input.extra80C || input.extraNPS || input.extra80D) ? (
          <p className="text-sm text-emerald-400/90">
            Investing {formatInr((input.extra80C ?? 0) + (input.extraNPS ?? 0) + (input.extra80D ?? 0))} more saves you{" "}
            {formatInr(whatIfSaved)} in taxes (old regime).
          </p>
        ) : null}
      </section>

      <TaxActionPlanSection
        input={input}
        result={result}
        isDemo={isDemo}
        saving={saving}
        onSavePlanVault={async () => postAction("save_plan_vault")}
      />

      <section className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || isDemo}
          onClick={() => postAction("save_vault")}
          className="btn-primary h-10 px-4 text-xs inline-flex items-center gap-2 disabled:opacity-40"
        >
          <FolderLock className="h-3.5 w-3.5" />
          Save to vault
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => postAction("download_pdf")}
          className="h-10 px-4 text-xs rounded-xl border border-[#c9a84c]/40 text-[#c9a84c] inline-flex items-center gap-2 hover:bg-[#c9a84c]/10 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleShareWithExpert()}
          className="h-10 px-4 text-xs rounded-xl border border-border/50 inline-flex items-center gap-2 hover:bg-muted/30 disabled:opacity-40"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share with CA
        </button>
        {!isDemo && (
          <button
            type="button"
            disabled={saving}
            onClick={() => postAction("save_snapshot")}
            className="h-10 px-4 text-xs rounded-xl border border-border/50 inline-flex items-center gap-2 hover:bg-muted/30 disabled:opacity-40"
          >
            Update wealth tax snapshot
          </button>
        )}
        <Link to="/dashboard/wealth-overview" className="h-10 px-4 text-xs rounded-xl border border-border/50 inline-flex items-center gap-2 hover:bg-muted/30">
          View wealth overview
        </Link>
      </section>

      {showSnapshotPrompt && !isDemo && (
        <div className="glass rounded-xl border border-[#c9a84c]/30 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Update your tax snapshot on Wealth Overview with these results?</p>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              postAction("save_snapshot");
              setShowSnapshotPrompt(false);
            }}
            className="text-xs text-[#c9a84c] hover:underline"
          >
            Yes, update snapshot
          </button>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/80 text-center pb-4 italic">
        This is an estimate for planning purposes only. Consult your CA for final tax filing.
      </p>

      {showShare && caExpert && (
        <IntroductionRequestModal
          expert={caExpert}
          onClose={() => {
            setShowShare(false);
            setShareMessageOverride(null);
          }}
          defaultMessage={shareMessage}
        />
      )}
    </div>
  );
}
