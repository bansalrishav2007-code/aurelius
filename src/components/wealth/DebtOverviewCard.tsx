import { computeDebtOverview, formatInr } from "@/lib/wealth/calculations";

type Props = {
  totalAssets: number;
  totalLiabilities: number;
};

export function DebtOverviewCard({ totalAssets, totalLiabilities }: Props) {
  const debt = computeDebtOverview(totalAssets, totalLiabilities);

  return (
    <section className="glass rounded-2xl p-6 border border-border/60">
      <h3 className="font-display text-lg mb-4">Debt overview</h3>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Total debt</p>
          <p className="text-lg font-medium tabular-nums text-red-300/90">{formatInr(debt.totalDebt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Debt to asset ratio</p>
          <p className="text-lg font-medium tabular-nums">{debt.ratio}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <span
            className="inline-flex text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded-full mt-1"
            style={{
              color: debt.statusColor,
              backgroundColor: `${debt.statusColor}20`,
              border: `1px solid ${debt.statusColor}40`,
            }}
          >
            {debt.statusLabel}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{debt.tip}</p>
    </section>
  );
}
