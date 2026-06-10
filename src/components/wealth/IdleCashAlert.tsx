import { formatInr } from "@/lib/wealth/calculations";

export function IdleCashAlert({ cashAmount, cashPct }: { cashAmount: number; cashPct: number }) {
  if (cashPct <= 20) return null;

  const suggestions = [
    { label: "Debt mutual funds", note: "~7–8% p.a. vs 4–5% FD", uplift: "₹1.2–1.8L/yr per ₹1Cr" },
    { label: "Sovereign Gold Bonds", note: "2.5% coupon + gold upside", uplift: "Inflation hedge" },
    { label: "Short-duration debt", note: "Low volatility, tax-efficient", uplift: "~1% above FD" },
  ];

  return (
    <div className="glass rounded-2xl p-5 border border-gold/20 space-y-3">
      <p className="text-sm font-medium">
        🟡 You have {formatInr(cashAmount)} in cash/FD ({cashPct}% of portfolio) — above the 20% prudent threshold
      </p>
      <p className="text-xs text-muted-foreground">AI suggests deploying idle cash:</p>
      <ul className="space-y-2 text-xs">
        {suggestions.map((s) => (
          <li key={s.label} className="panel-muted rounded-lg px-3 py-2">
            <span className="font-medium text-gold">{s.label}</span> — {s.note}
            <span className="text-muted-foreground block mt-0.5">Est. uplift: {s.uplift}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
