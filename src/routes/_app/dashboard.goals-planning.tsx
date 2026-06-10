import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GanttChart, LayoutGrid, Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { DemoFeatureLock } from "@/components/demo/DemoFeatureLock";
import { GoalsSummaryBar } from "@/components/goals/GoalsSummaryBar";
import { CreateGoalModal, type CreateGoalInput } from "@/components/goals/CreateGoalModal";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalAiDrawer } from "@/components/goals/GoalAiDrawer";
import { GoalDetailModal } from "@/components/goals/GoalDetailModal";
import { GoalsTimeline } from "@/components/goals/GoalsTimeline";
import { summarizeGoals } from "@/lib/goals/calculations";
import type { EnrichedGoal, GoalAiAdvice } from "@/lib/goals/types";
import {
  createMemberGoal,
  deleteMemberGoal,
  fetchMemberGoals,
} from "@/lib/member/client";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/dashboard/goals-planning")({
  head: () => ({ meta: [{ title: "Goals & Planning — Aurelius" }] }),
  component: GoalsPlanningPage,
});

type ViewMode = "cards" | "timeline";

function GoalsPlanningPage() {
  const { session } = AppRoute.useRouteContext();
  const isDemo = session.isDemo === true;

  const [goals, setGoals] = useState<EnrichedGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [aiGoal, setAiGoal] = useState<EnrichedGoal | null>(null);
  const [detailGoal, setDetailGoal] = useState<EnrichedGoal | null>(null);

  const load = useCallback(async () => {
    const data = await fetchMemberGoals();
    setGoals(data.goals);
  }, []);

  useEffect(() => {
    load()
      .catch(() => toast.error("Unable to load goals."))
      .finally(() => setLoading(false));
  }, [load]);

  const summary = useMemo(() => summarizeGoals(goals), [goals]);
  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);

  async function handleCreate(input: CreateGoalInput) {
    setSaving(true);
    try {
      await createMemberGoal(input);
      setShowCreate(false);
      await load();
      toast.success("Goal created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create goal.");
    } finally {
      setSaving(false);
    }
  }

  const handleAdviceComplete = useCallback((goalId: string, advice: GoalAiAdvice) => {
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, aiAdvice: advice } : g)));
    setAiGoal((prev) => (prev?.id === goalId ? { ...prev, aiAdvice: advice } : prev));
  }, []);

  if (loading) {
    return (
      <div className="p-5 lg:p-10 max-w-[1400px] mx-auto min-w-0">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-10 max-w-[1400px] mx-auto min-w-0">
      <PageHeader
        title="Goals & Planning"
        subtitle="Set financial objectives, track progress, and get AI-powered guidance on achieving them."
      >
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`h-9 px-3 text-xs inline-flex items-center gap-1.5 ${
                viewMode === "cards" ? "bg-[#c9a84c] text-[#0a0e1a]" : "text-muted-foreground hover:bg-muted/20"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`h-9 px-3 text-xs inline-flex items-center gap-1.5 ${
                viewMode === "timeline" ? "bg-[#c9a84c] text-[#0a0e1a]" : "text-muted-foreground hover:bg-muted/20"
              }`}
            >
              <GanttChart className="h-3.5 w-3.5" /> Timeline
            </button>
          </div>
          {!isDemo && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="h-9 px-4 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#c9a84c]/90"
            >
              <Plus className="h-3.5 w-3.5" /> New Goal
            </button>
          )}
        </div>
      </PageHeader>

      <GoalsSummaryBar
        total={summary.total}
        onTrack={summary.onTrack}
        atRisk={summary.atRisk}
        achieved={summary.achieved}
      />

      {isDemo && (
        <DemoFeatureLock
          title="Goal editing locked in demo"
          description="Sample goals shown below. Full membership unlocks private goal tracking and AI advisor."
          className="mb-6"
        />
      )}

      {goals.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border/50 bg-[#0a0e1a]/60">
          <Target className="h-10 w-10 mx-auto text-[#c9a84c]/40 mb-4" />
          <p className="font-display text-xl text-foreground mb-2">
            Define what wealth means to you.
          </p>
          <p className="text-sm text-muted-foreground mb-6">Add your first goal.</p>
          {!isDemo && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="h-10 w-10 rounded-full border border-[#c9a84c]/40 text-[#c9a84c] inline-flex items-center justify-center hover:bg-[#c9a84c]/10"
              aria-label="Add first goal"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      ) : viewMode === "timeline" ? (
        <GoalsTimeline goals={activeGoals} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {activeGoals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              readOnly={isDemo}
              onOpen={() => setDetailGoal(g)}
              onAskAi={() => setAiGoal(g)}
              onDelete={
                isDemo
                  ? undefined
                  : () => {
                      if (!confirm("Delete this goal?")) return;
                      deleteMemberGoal(g.id)
                        .then(load)
                        .catch(() => toast.error("Delete failed"));
                    }
              }
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGoalModal
          open={showCreate}
          saving={saving}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

      <GoalDetailModal
        goal={detailGoal}
        onClose={() => setDetailGoal(null)}
        onAskAi={() => {
          if (detailGoal) setAiGoal(detailGoal);
          setDetailGoal(null);
        }}
      />

      {aiGoal && (
        <GoalAiDrawer
          goal={aiGoal}
          open={Boolean(aiGoal)}
          onClose={() => setAiGoal(null)}
          onAdviceComplete={(advice) => handleAdviceComplete(aiGoal.id, advice)}
        />
      )}
    </div>
  );
}
