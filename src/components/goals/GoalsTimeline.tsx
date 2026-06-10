import { format } from "date-fns";
import { formatInr } from "@/lib/wealth/calculations";
import type { EnrichedGoal } from "@/lib/goals/types";

type Props = {
  goals: EnrichedGoal[];
};

export function GoalsTimeline({ goals }: Props) {
  const withDates = goals.filter((g) => g.targetDate);
  if (withDates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Add target dates to your goals to see them on the timeline.
      </p>
    );
  }

  const now = new Date();
  const end = new Date(now);
  end.setFullYear(end.getFullYear() + 10);

  const latestTarget = withDates.reduce((max, g) => {
    const d = new Date(g.targetDate!).getTime();
    return d > max ? d : max;
  }, end.getTime());

  const axisEnd = new Date(Math.max(latestTarget, end.getTime()));
  const spanMs = axisEnd.getTime() - now.getTime();

  function positionPct(dateIso: string) {
    const t = new Date(dateIso).getTime();
    const pct = ((t - now.getTime()) / spanMs) * 100;
    return Math.min(98, Math.max(2, pct));
  }

  const yearMarkers: number[] = [];
  const cursor = new Date(now);
  cursor.setMonth(0, 1);
  while (cursor.getTime() <= axisEnd.getTime()) {
    yearMarkers.push(cursor.getFullYear());
    cursor.setFullYear(cursor.getFullYear() + 1);
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-[#0a0e1a]/80 p-6 overflow-x-auto">
      <p className="text-xs text-muted-foreground mb-8">
        Financial obligations over the next decade — spot clustering and plan liquidity accordingly.
      </p>

      <div className="relative min-w-[720px] pt-8 pb-16">
        <div className="absolute left-0 right-0 top-12 h-0.5 bg-[#1a2035]" />
        <div
          className="absolute top-12 h-0.5 bg-gradient-to-r from-[#c9a84c]/40 to-[#c9a84c]"
          style={{ left: 0, width: "100%" }}
        />

        {yearMarkers.map((year, i) => {
          const yearStart = new Date(year, 0, 1);
          const pct = ((yearStart.getTime() - now.getTime()) / spanMs) * 100;
          if (pct < 0 || pct > 100) return null;
          return (
            <div
              key={year}
              className="absolute top-[2.6rem] text-[10px] text-muted-foreground -translate-x-1/2"
              style={{ left: `${pct}%` }}
            >
              <div className="w-px h-3 bg-border/60 mx-auto mb-1" />
              {year}
            </div>
          );
        })}

        {withDates.map((goal, index) => {
          const left = positionPct(goal.targetDate!);
          const offset = (index % 2) * 3.5;
          return (
            <div
              key={goal.id}
              className="absolute -translate-x-1/2"
              style={{ left: `${left}%`, top: `${2.5 + offset}rem` }}
            >
              <div className="w-3 h-3 rounded-full bg-[#c9a84c] border-2 border-[#0a0e1a] shadow-[0_0_12px_rgba(201,168,76,0.5)] mx-auto" />
              <div className="mt-3 w-36 text-center">
                <p className="text-[10px] font-medium text-foreground truncate">{goal.title}</p>
                <p className="text-[10px] text-[#c9a84c] mt-0.5">
                  {goal.targetAmount ? formatInr(goal.targetAmount) : "—"}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {format(new Date(goal.targetDate!), "MMM yyyy")}
                </p>
              </div>
            </div>
          );
        })}

        <div className="absolute left-0 top-8 text-[10px] text-emerald-400 font-medium">Today</div>
      </div>
    </div>
  );
}
