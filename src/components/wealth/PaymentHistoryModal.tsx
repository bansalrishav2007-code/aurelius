import { X } from "lucide-react";
import { formatInr } from "@/lib/wealth/calculations";
import type { LiabilityPayment, LiabilityPaymentType } from "@/lib/wealth/types";

const TYPE_LABELS: Record<LiabilityPaymentType, string> = {
  emi: "EMI",
  part_payment: "Part Payment",
  full_closure: "Full Closure",
};

type Props = {
  open: boolean;
  liabilityName: string;
  payments: LiabilityPayment[];
  totalPaid: number;
  onClose: () => void;
};

export function PaymentHistoryModal({ open, liabilityName, payments, totalPaid, onClose }: Props) {
  if (!open) return null;

  const sorted = [...payments].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto glass-strong rounded-t-2xl sm:rounded-2xl p-6 border border-border/60 shadow-luxury">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-lg">Payment history</h3>
            <p className="text-xs text-muted-foreground mt-1">{liabilityName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <th className="text-left py-2 pr-2">Date</th>
                <th className="text-left py-2 pr-2">Amount</th>
                <th className="text-left py-2 pr-2">Type</th>
                <th className="text-left py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} className="border-b border-border/20">
                  <td className="py-2 pr-2 text-xs">
                    {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </td>
                  <td className="py-2 pr-2 tabular-nums">{formatInr(p.amount)}</td>
                  <td className="py-2 pr-2 text-xs">{TYPE_LABELS[p.type]}</td>
                  <td className="py-2 text-xs text-muted-foreground">{p.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="text-sm font-medium mt-4 pt-3 border-t border-border/40">
          Total paid: <span className="text-gold">{formatInr(totalPaid)}</span>
        </p>
      </div>
    </div>
  );
}
