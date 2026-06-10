import type { WealthLiability } from "@/lib/wealth/types";
import { DebtOverviewCard } from "./DebtOverviewCard";
import { LiabilityCard } from "./LiabilityCard";

type Props = {
  liabilities: WealthLiability[];
  totalAssets: number;
  totalLiabilities: number;
  isDemo?: boolean;
  saving?: boolean;
  onRecordPayment: (
    liabilityId: string,
    input: {
      amount: number;
      date: string;
      type: import("@/lib/wealth/types").LiabilityPaymentType;
      notes?: string;
    },
  ) => Promise<void>;
  onUpdateAmount: (liabilityId: string, value: number) => Promise<void>;
};

export function LiabilitiesSection({
  liabilities,
  totalAssets,
  totalLiabilities,
  isDemo,
  saving,
  onRecordPayment,
  onUpdateAmount,
}: Props) {
  if (liabilities.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-xl mb-4">Liabilities</h2>
        <div className="space-y-3">
          {liabilities.map((item) => (
            <LiabilityCard
              key={item.id}
              liability={item}
              isDemo={isDemo}
              saving={saving}
              onRecordPayment={(input) => onRecordPayment(item.id, input)}
              onUpdateAmount={(value) => onUpdateAmount(item.id, value)}
            />
          ))}
        </div>
      </div>
      <DebtOverviewCard totalAssets={totalAssets} totalLiabilities={totalLiabilities} />
    </section>
  );
}
