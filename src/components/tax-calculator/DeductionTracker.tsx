import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { InrInput } from "@/components/client/InrInput";
import { formatInrInput, parseInrInput } from "@/lib/format-inr-input";
import { formatInr } from "@/lib/wealth/calculations";
import type { TaxCalculatorInput } from "@/lib/wealth/tax-calculator";
import type { DeductionLedgerItem } from "@/lib/wealth/tax-deduction-ledger";

const ADVANCED_FIELDS: Array<{
  key: keyof TaxCalculatorInput;
  label: string;
  section: string;
}> = [
  { key: "deduction80CCC", label: "80CCC — Pension fund", section: "80" },
  { key: "deduction80CCD1", label: "80CCD(1) — NPS employee", section: "80" },
  { key: "deduction80CCD2", label: "80CCD(2) — Employer NPS", section: "80" },
  { key: "deduction80DParents", label: "80D — Health insurance parents", section: "80" },
  { key: "deduction80DD", label: "80DD — Disabled dependent", section: "80" },
  { key: "deduction80DDB", label: "80DDB — Medical treatment", section: "80" },
  { key: "deduction80E", label: "80E — Education loan interest", section: "80" },
  { key: "deduction80EE", label: "80EE — First home loan interest", section: "80" },
  { key: "deduction80G", label: "80G — Donations", section: "80" },
  { key: "deduction80GG", label: "80GG — Rent (no HRA)", section: "80" },
  { key: "deduction80TTB", label: "80TTB — Senior citizen interest", section: "80" },
  { key: "deduction80U", label: "80U — Disability self", section: "80" },
  { key: "ltaExemption", label: "LTA exemption", section: "Other" },
  { key: "professionalTax", label: "Professional tax", section: "Other" },
  { key: "exemption54", label: "54 — Reinvestment in property", section: "CG" },
  { key: "exemption54EC", label: "54EC — Capital gains bonds", section: "CG" },
  { key: "exemption54F", label: "54F — Reinvestment (non-property)", section: "CG" },
];

type Props = {
  ledger: DeductionLedgerItem[];
  input: TaxCalculatorInput;
  totalTaxSaved: number;
  onPatch: (p: Partial<TaxCalculatorInput>) => void;
};

function AdvancedField({
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

export function DeductionTracker({ ledger, input, totalTaxSaved, onPatch }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const claimed = ledger.filter((l) => l.claimed && (l.amount > 0 || l.auto));

  const groups = {
    section80: claimed.filter((l) => l.group === "section80"),
    other: claimed.filter((l) => l.group === "other"),
    capital_gains: claimed.filter((l) => l.group === "capital_gains"),
  };

  return (
    <section className="glass rounded-2xl border border-border/40 p-5 lg:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-[#c9a84c]">Deductions Applied</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {claimed.length} deduction{claimed.length !== 1 ? "s" : ""} tracked · Tax saved via deductions{" "}
            <span className="text-[#c9a84c]">{formatInr(totalTaxSaved)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="text-xs text-[#c9a84c] inline-flex items-center gap-1 hover:underline"
        >
          {advancedOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {advancedOpen ? "Hide" : "Add"} advanced deductions
        </button>
      </div>

      {advancedOpen && (
        <div className="grid sm:grid-cols-2 gap-4 rounded-xl border border-border/30 p-4 bg-[#0a0e1a]/50">
          {ADVANCED_FIELDS.map(({ key, label }) => (
            <AdvancedField
              key={key}
              label={label}
              value={(input[key] as number) ?? 0}
              onChange={(v) => onPatch({ [key]: v })}
            />
          ))}
        </div>
      )}

      {claimed.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deductions entered yet. Add values above to track tax savings.</p>
      ) : (
        <div className="space-y-4">
          {(["section80", "other", "capital_gains"] as const).map((group) => {
            const items = groups[group];
            if (items.length === 0) return null;
            const title =
              group === "section80" ? "Section 80 Deductions" : group === "other" ? "Other Deductions" : "Capital Gains Exemptions";
            return (
              <div key={group}>
                <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-border/30 px-3 py-2.5 text-sm"
                    >
                      <span className="h-5 w-5 rounded border border-emerald-400/40 bg-emerald-400/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-emerald-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {item.section} — {item.label}
                          {item.auto && <span className="text-[10px] text-muted-foreground ml-1">(auto)</span>}
                        </p>
                        {item.detail && <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>}
                        <p className="text-xs text-[#c9a84c] mt-1">
                          {formatInr(item.amount)}
                          {item.maxReached && " · Maximum limit reached"}
                          {item.taxSaved > 0 && ` · Tax saved ${formatInr(item.taxSaved)}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
