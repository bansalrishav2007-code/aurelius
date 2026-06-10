import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { InrInput } from "@/components/client/InrInput";
import { parseInrInput } from "@/lib/format-inr-input";
import type { LiabilityPaymentType } from "@/lib/wealth/types";

type Props = {
  open: boolean;
  liabilityName: string;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (input: { amount: number; date: string; type: LiabilityPaymentType; notes?: string }) => void;
};

export function RecordPaymentModal({ open, liabilityName, saving, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<LiabilityPaymentType>("emi");
  const [notes, setNotes] = useState("");

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInrInput(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onSubmit({ amount: parsed, date, type, notes: notes.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full sm:max-w-md glass-strong rounded-t-2xl sm:rounded-2xl p-6 border border-border/60 shadow-luxury space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg">Record payment</h3>
            <p className="text-xs text-muted-foreground mt-1">{liabilityName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <InrInput
            value={amount}
            onChange={setAmount}
            placeholder="₹0"
            required
            className="field-input tabular-nums"
          />
          <input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} required />
          <select className="field-input" value={type} onChange={(e) => setType(e.target.value as LiabilityPaymentType)}>
            <option value="emi">EMI</option>
            <option value="part_payment">Part Payment</option>
            <option value="full_closure">Full Closure</option>
          </select>
          <textarea
            className="field-input resize-none"
            rows={2}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !amount.trim()}
          className="w-full h-10 rounded-xl bg-foreground text-background text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Mark as Paid
        </button>
      </form>
    </div>
  );
}
