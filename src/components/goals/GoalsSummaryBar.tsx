import { Check, Target, TrendingUp, AlertTriangle } from "lucide-react";

type Props = {
  total: number;
  onTrack: number;
  atRisk: number;
  achieved: number;
};

export function GoalsSummaryBar({ total, onTrack, atRisk, achieved }: Props) {
  const items = [
    { label: "Total goals", value: total, icon: Target, color: "text-foreground" },
    { label: "On track", value: onTrack, icon: TrendingUp, color: "text-emerald-400" },
    { label: "At risk", value: atRisk, icon: AlertTriangle, color: "text-amber-400" },
    { label: "Achieved", value: achieved, icon: Check, color: "text-[#c9a84c]" },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border/40 bg-[#0a0e1a]/80 px-5 py-4 flex items-center gap-4"
        >
          <item.icon className={`h-5 w-5 shrink-0 ${item.color}`} />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
            <p className={`font-display text-2xl mt-0.5 ${item.color}`}>{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
