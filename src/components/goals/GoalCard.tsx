import { format } from "date-fns";
import { Sparkles, Star, Trash2 } from "lucide-react";
import { formatInr } from "@/lib/wealth/calculations";
import type { EnrichedGoal } from "@/lib/goals/types";
import { GoalCategoryIcon } from "./GoalCategoryIcon";

const STATUS_STYLES = {
  on_track: {
    label: "On Track",
    className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
    barClass: "bg-emerald-400",
  },
  at_risk: {
    label: "At Risk",
    className: "text-amber-400 bg-amber-400/10 border-amber-400/25",
    barClass: "bg-gradient-to-r from-red-500 to-amber-500",
  },
  achieved: {
    label: "Achieved",
    className: "text-[#c9a84c] bg-[#c9a84c]/10 border-[#c9a84c]/25",
    barClass: "bg-[#c9a84c]",
  },
} as const;

type Props = {
  goal: EnrichedGoal;
  readOnly?: boolean;
  onOpen?: () => void;
  onAskAi: () => void;
  onDelete?: () => void;
};

export function GoalCard({ goal, readOnly, onOpen, onAskAi, onDelete }: Props) {
  const status = STATUS_STYLES[goal.trackStatus];
  const barWidth = goal.trackStatus === "achieved" ? 100 : goal.progressPercent;

  return (
    <article
      className="rounded-2xl border border-border/40 bg-[#0a0e1a]/80 p-5 space-y-4 hover:border-[#c9a84c]/20 transition-colors cursor-pointer"
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen?.()}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <GoalCategoryIcon category={goal.category} className="h-6 w-6 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="font-display text-lg truncate">{goal.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{goal.category ?? "Other"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span
            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${status.className}`}
          >
            {goal.trackStatus === "achieved" && <Star className="h-3 w-3" />}
            {status.label}
          </span>
          {!readOnly && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
              title="Delete goal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {goal.isOverdue && goal.trackStatus !== "achieved" && (
        <p className="text-xs text-amber-400">⚠️ Target date passed</p>
      )}

      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-[#c9a84c] font-medium">{barWidth}% complete</span>
          {goal.targetAmount ? (
            <span className="text-muted-foreground">
              {formatInr(goal.currentAmount ?? 0)} / {formatInr(goal.targetAmount)}
            </span>
          ) : null}
        </div>
        <div className="h-2.5 rounded-full bg-[#1a2035] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${status.barClass}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-[#1a2035]/50 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Target date</p>
          <p className="mt-1 text-foreground">
            {goal.targetDate ? format(new Date(goal.targetDate), "d MMM yyyy") : "—"}
            {goal.monthsRemaining !== null && goal.monthsRemaining > 0 && (
              <span className="text-muted-foreground"> · {goal.monthsRemaining} months left</span>
            )}
          </p>
        </div>
        <div className="rounded-xl bg-[#1a2035]/50 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly needed</p>
          <p className="mt-1 text-foreground font-medium">
            {goal.monthlySavingNeeded !== null
              ? formatInr(goal.monthlySavingNeeded)
              : "Add target amount to calculate"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAskAi();
        }}
        className="w-full h-10 rounded-xl border border-[#c9a84c]/30 text-xs text-[#c9a84c] inline-flex items-center justify-center gap-2 hover:bg-[#c9a84c]/10 transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Ask AI about this goal
      </button>
    </article>
  );
}
