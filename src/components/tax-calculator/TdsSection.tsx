import { useEffect, useState } from "react";
import { AlertTriangle, PartyPopper } from "lucide-react";
import { InrInput } from "@/components/client/InrInput";
import { formatInrInput, parseInrInput } from "@/lib/format-inr-input";
import { formatInr } from "@/lib/wealth/calculations";
import type { TaxCalculatorInput } from "@/lib/wealth/tax-calculator";
import type { TdsReconciliation } from "@/lib/wealth/tax-deduction-ledger";

const TDS_FIELDS: Array<{
  key: keyof TaxCalculatorInput;
  label: string;
}> = [
  { key: "tdsSalary", label: "TDS on Salary (Form 16)" },
  { key: "tdsFdInterest", label: "TDS on FD Interest (26AS)" },
  { key: "tdsRent", label: "TDS on Rent received (194I)" },
  { key: "tdsProfessionalFees", label: "TDS on Professional fees (194J)" },
  { key: "tdsPropertySale", label: "TDS on Sale of property (194IA)" },
  { key: "advanceTaxPaid", label: "Advance tax paid" },
  { key: "selfAssessmentTaxPaid", label: "Self assessment tax paid" },
];

type Props = {
  input: TaxCalculatorInput;
  tds: TdsReconciliation;
  onPatch: (p: Partial<TaxCalculatorInput>) => void;
};

function TdsField({
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

export function TdsSection({ input, tds, onPatch }: Props) {
  return (
    <section className="glass rounded-2xl border border-border/40 p-5 lg:p-6 space-y-5">
      <div>
        <h2 className="font-display text-lg text-[#c9a84c]">TDS Already Paid</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Enter credits from Form 16, Form 26AS, and advance tax to reconcile your net position.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {TDS_FIELDS.map(({ key, label }) => (
          <TdsField
            key={key}
            label={label}
            value={(input[key] as number) ?? 0}
            onChange={(v) => onPatch({ [key]: v })}
          />
        ))}
      </div>

      <div className="rounded-xl border border-[#1a2035] bg-[#0a0e1a]/80 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total tax liability ({tds.winningRegime === "old" ? "Old" : "New"} regime)</span>
          <span className="font-medium tabular-nums">{formatInr(tds.grossTaxLiability)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total TDS / tax already paid</span>
          <span className="font-medium tabular-nums">{formatInr(tds.totalTdsPaid)}</span>
        </div>
        <div className="border-t border-border/40 pt-2 flex justify-between">
          {tds.isRefund ? (
            <>
              <span className="text-emerald-400 font-medium">Tax refund due</span>
              <span className="font-display text-emerald-400 tabular-nums">{formatInr(tds.refundDue)}</span>
            </>
          ) : (
            <>
              <span className="text-amber-400 font-medium">Balance tax payable</span>
              <span className="font-display text-amber-400 tabular-nums">{formatInr(tds.balancePayable)}</span>
            </>
          )}
        </div>
      </div>

      {tds.isRefund && tds.refundDue > 0 && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 flex gap-3">
          <PartyPopper className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-300/90">
            You have a tax refund of <strong>{formatInr(tds.refundDue)}</strong> due. File your ITR to claim it.
          </p>
        </div>
      )}

      {!tds.isRefund && tds.balancePayable > 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200/90">
            Balance tax of <strong>{formatInr(tds.balancePayable)}</strong> still to be paid.
            {tds.nextPaymentDate ? (
              <> Next advance tax date: <strong>{tds.nextPaymentDate}</strong>.</>
            ) : (
              <> Pay before 31 March 2026.</>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
