import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, Upload } from "lucide-react";
import { formatInr } from "@/lib/wealth/calculations";
import type { TaxSnapshot } from "@/lib/wealth/types";

const ADVANCE_TAX = [
  { label: "Q1 — 15%", date: "06-15", pct: 15 },
  { label: "Q2 — 45%", date: "09-15", pct: 45 },
  { label: "Q3 — 75%", date: "12-15", pct: 75 },
  { label: "Q4 — 100%", date: "03-15", pct: 100 },
] as const;

function advanceTaxSchedule() {
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyEndYear = fyStartYear + 1;
  return ADVANCE_TAX.map((q) => {
    const [m, d] = q.date.split("-").map(Number);
    const dueYear = m! <= 3 ? fyEndYear : fyStartYear;
    const due = new Date(dueYear, m! - 1, d);
    const daysToDue = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
    return { ...q, due, daysToDue, past: daysToDue < 0 };
  });
}

function ProgressBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{formatInr(used)} used</span>
        <span className="text-muted-foreground">of {formatInr(limit)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function TaxSnapshotSection({ tax, updatedAt }: { tax: TaxSnapshot | null | undefined; updatedAt?: string }) {
  if (!tax) {
    return (
      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-xl mb-4">Tax snapshot</h2>
        <p className="text-sm text-muted-foreground mb-4">Upload your ITR to populate tax estimates, or enter income manually via document upload.</p>
        <Link to="/dashboard/vault" className="text-sm text-gold inline-flex items-center gap-2 hover:underline">
          <Upload className="h-3.5 w-3.5" /> Upload ITR to vault
        </Link>
      </section>
    );
  }

  const stcgTax = tax.stcgTax ?? (tax.stcg != null ? Math.round(tax.stcg * 0.2) : undefined);
  const ltcgExempt = 1_25_000;
  const ltcgTaxable = tax.ltcg != null ? Math.max(0, tax.ltcg - ltcgExempt) : 0;
  const ltcgTax = tax.ltcgTax ?? (tax.ltcg != null ? Math.round(ltcgTaxable * 0.125) : undefined);
  const used80C = tax.used80C ?? 0;
  const limit80C = tax.limit80C ?? 1_50_000;
  const used80D = tax.used80D ?? 0;
  const limit80D = tax.limit80D ?? 25_000;
  const quarters = advanceTaxSchedule();
  const estTax = tax.estimatedTaxFy ?? tax.taxPaid ?? 0;

  return (
    <section className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Tax snapshot</h2>
        {updatedAt && (
          <span className="text-[10px] text-muted-foreground">
            Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {tax.aiExtracted && (
        <span className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
          <Sparkles className="h-2.5 w-2.5" /> AI extracted
        </span>
      )}

      <div className="rounded-xl border border-gold/20 bg-gold/5 p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated income tax this FY</p>
        <p className="font-display text-3xl text-gold mt-1 tabular-nums">{formatInr(estTax)}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        {tax.stcg != null && (
          <div className="panel-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground">STCG (20%)</p>
            <p className="font-medium mt-1">{formatInr(tax.stcg)}</p>
            {stcgTax != null && <p className="text-xs text-gold mt-0.5">Tax: {formatInr(stcgTax)}</p>}
          </div>
        )}
        {tax.ltcg != null && (
          <div className="panel-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground">LTCG (12.5% above ₹1.25L)</p>
            <p className="font-medium mt-1">{formatInr(tax.ltcg)}</p>
            {ltcgTax != null && <p className="text-xs text-gold mt-0.5">Tax: {formatInr(ltcgTax)}</p>}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium mb-2">80C deduction</p>
          <ProgressBar used={used80C} limit={limit80C} />
        </div>
        <div>
          <p className="text-xs font-medium mb-2">80D health insurance</p>
          <ProgressBar used={used80D} limit={limit80D} />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-4 space-y-3">
        <p className="text-xs font-medium">Advance tax instalments</p>
        {quarters.map((q) => {
          const instalment = Math.round(estTax * (q.pct / 100));
          const urgent = q.daysToDue >= 0 && q.daysToDue <= 30;
          return (
            <div key={q.label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm border-b border-border/30 pb-2 last:border-0 last:pb-0">
              <div>
                <span className="font-medium">{q.label}</span>
                <span className="text-muted-foreground text-xs ml-2">
                  {q.due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">Est. {formatInr(instalment)}</span>
                <span className={urgent ? "text-gold font-medium" : q.past ? "text-muted-foreground" : "text-muted-foreground"}>
                  {q.past ? "Passed" : `${q.daysToDue}d`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
