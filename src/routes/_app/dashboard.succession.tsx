import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Sparkles, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { LastUpdated } from "@/components/client/LastUpdated";
import { DemoFeatureLock } from "@/components/demo/DemoFeatureLock";
import { TierGate } from "@/components/membership/TierGate";
import { fetchSuccessionPlan, saveSuccessionPlan } from "@/lib/member/client";
import type { SuccessionMember, SuccessionPlan, WillStatus } from "@/lib/succession/types";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/dashboard/succession")({
  head: () => ({ meta: [{ title: "Succession Planning — Aurelius" }] }),
  component: SuccessionDashboardPage,
});

function SuccessionDashboardPage() {
  const { session } = AppRoute.useRouteContext();
  return (
    <TierGate session={session} feature="succession_planning" title="Succession Planning">
      <SuccessionContent isDemo={session.isDemo === true} />
    </TierGate>
  );
}

function SuccessionContent({ isDemo }: { isDemo: boolean }) {
  const [plan, setPlan] = useState<SuccessionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRelation, setMemberRelation] = useState("");

  async function load() {
    const { plan: p } = await fetchSuccessionPlan();
    setPlan(p);
  }

  useEffect(() => {
    load()
      .catch(() => toast.error("Unable to load succession plan."))
      .finally(() => setLoading(false));
  }, []);

  async function persist(next: SuccessionPlan) {
    if (isDemo) return;
    setSaving(true);
    try {
      const { plan: saved } = await saveSuccessionPlan(next);
      setPlan(saved);
      toast.success("Succession plan saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function addTreeMember() {
    if (!plan || !memberName.trim() || !memberRelation.trim()) return;
    const member: SuccessionMember = {
      id: `tree-${crypto.randomUUID()}`,
      name: memberName.trim(),
      relation: memberRelation.trim(),
      assignedAssetIds: [],
    };
    void persist({ ...plan, familyTree: [...plan.familyTree, member] });
    setMemberName("");
    setMemberRelation("");
  }

  if (loading || !plan) {
    return (
      <div className="p-5 lg:p-10 max-w-[1440px] mx-auto">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-10 max-w-[1440px] mx-auto">
      <PageHeader title="Succession Planning" subtitle="Family tree, will status, trust structures, and AI completeness checks.">
        <LastUpdated iso={plan.updatedAt} />
      </PageHeader>

      {plan.aiRecommendation && (
        <div className="glass rounded-2xl p-5 mb-6 flex gap-3 text-sm">
          <Sparkles className="h-4 w-4 text-gold shrink-0 mt-0.5" />
          <p>{plan.aiRecommendation}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg flex items-center gap-2">
            <Target className="h-4 w-4 text-gold" /> Family tree
          </h2>
          {isDemo ? (
            <DemoFeatureLock title="Editing locked in demo" description="Preview succession structure only." />
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Name" className="field-input flex-1" />
              <input value={memberRelation} onChange={(e) => setMemberRelation(e.target.value)} placeholder="Relation" className="field-input flex-1" />
              <button type="button" onClick={addTreeMember} disabled={saving} className="h-10 px-4 rounded-xl bg-foreground text-background text-sm inline-flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          )}
          {plan.familyTree.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add spouse, children, or parents and assign assets to each.</p>
          ) : (
            <ul className="space-y-2">
              {plan.familyTree.map((m) => (
                <li key={m.id} className="panel-muted rounded-xl p-3 flex justify-between items-center">
                  <span className="text-sm"><strong>{m.name}</strong> — {m.relation}</span>
                  {!isDemo && (
                    <button
                      type="button"
                      onClick={() => void persist({ ...plan, familyTree: plan.familyTree.filter((x) => x.id !== m.id) })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg">Will status</h2>
          <select
            value={plan.willStatus}
            disabled={isDemo}
            onChange={(e) => void persist({ ...plan, willStatus: e.target.value as WillStatus, willUpdatedAt: new Date().toISOString() })}
            className="field-input"
          >
            <option value="no">No will</option>
            <option value="in_progress">In progress</option>
            <option value="yes">Will made</option>
          </select>
          {plan.willUpdatedAt && (
            <p className="text-xs text-muted-foreground">Last updated: {new Date(plan.willUpdatedAt).toLocaleDateString("en-IN")}</p>
          )}
          <p className="text-xs text-muted-foreground">Upload your will to the vault and link it from the Smart Vault page.</p>
        </section>

        <section className="glass rounded-2xl p-6 space-y-4 lg:col-span-2">
          <h2 className="font-display text-lg">Trust structure</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={plan.hasFamilyTrust}
              disabled={isDemo}
              onChange={(e) => void persist({ ...plan, hasFamilyTrust: e.target.checked })}
            />
            Family trust in place
          </label>
          <textarea
            value={plan.trustDetails ?? ""}
            disabled={isDemo}
            onChange={(e) => setPlan({ ...plan, trustDetails: e.target.value })}
            onBlur={() => !isDemo && void persist(plan)}
            placeholder="Trust details, trustees, key terms…"
            rows={3}
            className="field-input resize-none"
          />
        </section>
      </div>
    </div>
  );
}
