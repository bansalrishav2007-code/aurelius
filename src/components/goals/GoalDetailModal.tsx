import { format } from "date-fns";
import { Link } from "@tanstack/react-router";
import { Check, Sparkles, Star, X } from "lucide-react";
import { formatInr } from "@/lib/wealth/calculations";
import type { EnrichedGoal } from "@/lib/goals/types";

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
  goal: EnrichedGoal | null;
  onClose: () => void;
  onAskAi: () => void;
};

export function GoalDetailModal({ goal, onClose, onAskAi }: Props) {
  if (!goal) return null;

  const status = STATUS_STYLES[goal.trackStatus];
  const barWidth = goal.trackStatus === "achieved" ? 100 : goal.progressPercent;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-strong rounded-t-2xl sm:rounded-2xl p-6 border border-border/60">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h2 className="font-display text-xl">{goal.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">{goal.category ?? "Other"} · {goal.priority} priority</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${status.className}`}>
              {goal.trackStatus === "achieved" && <Star className="h-3 w-3" />}
              {status.label}
            </span>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {goal.isOverdue && goal.trackStatus !== "achieved" && (
          <p className="text-xs text-amber-400 mb-4">⚠️ Target date passed</p>
        )}

        <div className="mb-6">
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

        {goal.description && (
          <section className="mb-6">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Description</h3>
            <p className="text-sm leading-relaxed">{goal.description}</p>
          </section>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 text-sm">
          <div className="rounded-xl border border-border/40 p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Target</p>
            <p className="font-medium mt-1">{goal.targetAmount ? formatInr(goal.targetAmount) : "Not set"}</p>
          </div>
          <div className="rounded-xl border border-border/40 p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Saved</p>
            <p className="font-medium mt-1">{formatInr(goal.currentAmount ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-border/40 p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Monthly needed</p>
            <p className="font-medium mt-1">
              {goal.monthlySavingNeeded !== null
                ? formatInr(goal.monthlySavingNeeded)
                : goal.targetAmount
                  ? "—"
                  : "Add target amount"}
            </p>
          </div>
          <div className="rounded-xl border border-border/40 p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Target date</p>
            <p className="font-medium mt-1">
              {goal.targetDate ? format(new Date(goal.targetDate), "d MMM yyyy") : "—"}
              {goal.monthsRemaining !== null && goal.monthsRemaining > 0 && (
                <span className="block text-[10px] text-muted-foreground mt-0.5">{goal.monthsRemaining} months left</span>
              )}
            </p>
          </div>
        </div>

        <section className="mb-6">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Progress history</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between gap-3 rounded-lg border border-border/30 px-3 py-2">
              <span className="text-muted-foreground">{format(new Date(goal.createdAt), "d MMM yyyy")}</span>
              <span>Goal created · {formatInr(0)} saved</span>
            </li>
            {(goal.currentAmount ?? 0) > 0 && (
              <li className="flex justify-between gap-3 rounded-lg border border-border/30 px-3 py-2">
                <span className="text-muted-foreground">{format(new Date(goal.updatedAt), "d MMM yyyy")}</span>
                <span className="text-[#c9a84c]">{formatInr(goal.currentAmount ?? 0)} saved ({goal.progressPercent}%)</span>
              </li>
            )}
            {goal.trackStatus === "achieved" && (
              <li className="flex justify-between gap-3 rounded-lg border border-[#c9a84c]/30 bg-[#c9a84c]/5 px-3 py-2">
                <span className="text-muted-foreground">Achieved</span>
                <span className="text-[#c9a84c]">{formatInr(goal.targetAmount ?? goal.currentAmount ?? 0)}</span>
              </li>
            )}
          </ul>
        </section>

        {(goal.milestones?.length ?? 0) > 0 && (
          <section className="mb-6">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Milestones</h3>
            <ul className="space-y-2">
              {goal.milestones!.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <span className={`h-5 w-5 rounded-full border flex items-center justify-center ${m.completed ? "bg-success/20 border-success text-success" : "border-border/60"}`}>
                    {m.completed && <Check className="h-3 w-3" />}
                  </span>
                  {m.title}
                </li>
              ))}
            </ul>
          </section>
        )}

        {goal.aiAdvice && (
          <section className="mb-6 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4">
            <h3 className="text-xs uppercase tracking-wider text-[#c9a84c] mb-2">AI recommendations</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{goal.aiAdvice.sharpAdvice}</p>
            <p className="text-xs text-muted-foreground mt-2">Monthly: {goal.aiAdvice.recommendedMonthly}</p>
          </section>
        )}

        {goal.aiSuggestion && !goal.aiAdvice && (
          <section className="mb-6 rounded-xl border border-border/40 p-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">AI suggestion</h3>
            <p className="text-sm text-muted-foreground">{goal.aiSuggestion}</p>
          </section>
        )}

        <div className="flex flex-wrap gap-2 pt-4 border-t border-border/40">
          <button type="button" onClick={onAskAi} className="hairline h-9 px-4 rounded-lg text-xs inline-flex items-center gap-1.5 text-[#c9a84c]">
            <Sparkles className="h-3.5 w-3.5" /> Ask AI
          </button>
          <Link to="/dashboard/vault" className="hairline h-9 px-4 rounded-lg text-xs inline-flex items-center">
            Related documents
          </Link>
          <Link to="/dashboard/experts" className="hairline h-9 px-4 rounded-lg text-xs inline-flex items-center">
            Connect expert
          </Link>
        </div>
      </div>
    </div>
  );
}
