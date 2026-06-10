import { useState } from "react";
import { handleInrInputChange, parseInrInput } from "@/lib/format-inr-input";
import { formatInr, liabilityAmountMissing, liabilityTotals } from "@/lib/wealth/calculations";
import { getLiabilityTypeMeta } from "@/lib/wealth/categories";
import type { WealthLiability } from "@/lib/wealth/types";
import { PaymentHistoryModal } from "./PaymentHistoryModal";
import { RecordPaymentModal } from "./RecordPaymentModal";

type Props = {
  liability: WealthLiability;
  isDemo?: boolean;
  saving?: boolean;
  onRecordPayment: (input: {
    amount: number;
    date: string;
    type: import("@/lib/wealth/types").LiabilityPaymentType;
    notes?: string;
  }) => Promise<void>;
  onUpdateAmount: (value: number) => Promise<void>;
};

export function LiabilityCard({ liability, isDemo, saving, onRecordPayment, onUpdateAmount }: Props) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState("");

  const meta = getLiabilityTypeMeta(liability.type);
  const Icon = meta.icon;
  const missing = liabilityAmountMissing(liability);
  const { original, outstanding, paid, percent } = liabilityTotals(liability);
  const payments = liability.payments ?? [];
  const lastPayment = [...payments].sort((a, b) => b.date.localeCompare(a.date))[0];
  const isClosed = liability.status === "closed";

  async function handleSaveAmount() {
    const v = parseInrInput(amountInput);
    if (!Number.isFinite(v) || v < 0) return;
    await onUpdateAmount(v);
    setEditingAmount(false);
    setAmountInput("");
  }

  return (
    <>
      <div className={`rounded-xl border px-4 py-4 space-y-3 ${isClosed ? "border-success/40 bg-success/5" : "border-border/60"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg border border-border/60 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-gold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">{liability.name}</p>
                {isClosed && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/20 text-success border border-success/30">
                    Closed
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {meta.label} · Added {liability.dateAdded}
                {liability.aiExtracted ? " · AI extracted" : ""}
              </p>
            </div>
          </div>
        </div>

        {missing ? (
          <button
            type="button"
            onClick={() => {
              if (isDemo) return;
              setEditingAmount(true);
              setAmountInput("");
            }}
            className="text-xs text-amber-400 hover:text-amber-300 text-left"
          >
            ⚠️ Amount missing — tap to add
          </button>
        ) : editingAmount ? (
          <div className="flex gap-2 items-center">
            <input
              className="field-input h-8 text-xs flex-1 tabular-nums"
              placeholder="Outstanding amount (₹)"
              value={amountInput}
              onChange={(e) => handleInrInputChange(e.target.value, setAmountInput)}
              autoFocus
            />
            <button type="button" className="text-xs text-gold" onClick={handleSaveAmount} disabled={saving}>
              Save
            </button>
            <button type="button" className="text-xs text-muted-foreground" onClick={() => setEditingAmount(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Original</p>
              <p className="font-medium tabular-nums">{formatInr(original)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid</p>
              <p className="font-medium tabular-nums text-success">
                {formatInr(paid)} ({percent}%)
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Outstanding</p>
              <p className="font-medium tabular-nums text-red-300/90">{formatInr(outstanding)}</p>
            </div>
          </div>
        )}

        {!missing && !isClosed && original > 0 && (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gold transition-all min-w-[2px]"
                style={{ width: `${Math.min(100, Math.max(percent > 0 ? 2 : 0, percent))}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{percent}% repaid</p>
          </div>
        )}

        {lastPayment && (
          <p className="text-xs text-muted-foreground">
            Last payment: {formatInr(lastPayment.amount)} ·{" "}
            {new Date(lastPayment.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}

        {!isDemo && !isClosed && !missing && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPaymentOpen(true)}
              className="hairline h-8 px-3 rounded-lg text-xs"
            >
              Record Payment
            </button>
            {payments.length > 0 && (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="hairline h-8 px-3 rounded-lg text-xs"
              >
                View History
              </button>
            )}
          </div>
        )}
      </div>

      <RecordPaymentModal
        open={paymentOpen}
        liabilityName={liability.name}
        saving={saving}
        onClose={() => setPaymentOpen(false)}
        onSubmit={async (input) => {
          await onRecordPayment(input);
          setPaymentOpen(false);
        }}
      />

      <PaymentHistoryModal
        open={historyOpen}
        liabilityName={liability.name}
        payments={payments}
        totalPaid={paid}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
