import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Building2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { EmptyState } from "@/components/client/EmptyState";
import { LastUpdated } from "@/components/client/LastUpdated";
import { DemoFeatureLock } from "@/components/demo/DemoFeatureLock";
import { TierGate } from "@/components/membership/TierGate";
import { deleteLegalEntity, fetchLegalEntities, upsertLegalEntity } from "@/lib/member/client";
import { formatInr } from "@/lib/wealth/calculations";
import type { TrackedLegalEntity } from "@/lib/legal-entities/types";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/dashboard/legal-entities")({
  head: () => ({ meta: [{ title: "Legal Entities — Aurelius" }] }),
  component: LegalEntitiesDashboardPage,
});

const complianceStyle = {
  compliant: "text-success",
  due_soon: "text-gold",
  overdue: "text-destructive",
} as const;

function LegalEntitiesDashboardPage() {
  const { session } = AppRoute.useRouteContext();
  return (
    <TierGate session={session} feature="legal_entities" title="Legal Entity Tracking">
      <LegalEntitiesContent isDemo={session.isDemo === true} />
    </TierGate>
  );
}

function LegalEntitiesContent({ isDemo }: { isDemo: boolean }) {
  const [entities, setEntities] = useState<TrackedLegalEntity[]>([]);
  const [aiFlags, setAiFlags] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState<TrackedLegalEntity["entityType"]>("company");
  const [role, setRole] = useState<TrackedLegalEntity["role"]>("director");
  const [shareholding, setShareholding] = useState("");
  const [valuation, setValuation] = useState("");
  const [rocDue, setRocDue] = useState("");

  async function load() {
    const data = await fetchLegalEntities();
    setEntities(data.entities);
    setAiFlags(data.aiFlags);
    setUpdatedAt(data.updatedAt);
  }

  useEffect(() => {
    load()
      .catch(() => toast.error("Unable to load entities."))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await upsertLegalEntity({
        name,
        entityType,
        role,
        shareholdingPercent: shareholding ? Number(shareholding) : undefined,
        estimatedValuation: valuation ? Number(valuation) : undefined,
        rocFilingDue: rocDue || undefined,
      });
      setName("");
      setShareholding("");
      setValuation("");
      setRocDue("");
      await load();
      toast.success("Entity saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    }
  }

  if (loading) {
    return (
      <div className="p-5 lg:p-10 max-w-[1440px] mx-auto">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-10 max-w-[1440px] mx-auto">
      <PageHeader title="Legal Entities" subtitle="Track companies, LLPs, trusts — compliance deadlines and holding structure flags.">
        <LastUpdated iso={updatedAt} />
      </PageHeader>

      {aiFlags.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-6 space-y-2">
          <h2 className="font-display text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" /> AI flags
          </h2>
          {aiFlags.map((f) => (
            <p key={f} className="text-sm text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" /> {f}
            </p>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {isDemo ? (
          <DemoFeatureLock title="Entity editing locked in demo" description="Preview compliance tracker only." className="lg:col-span-1" />
        ) : (
          <form onSubmit={handleAdd} className="glass rounded-2xl p-6 space-y-3 lg:col-span-1">
            <h2 className="font-display text-lg flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add entity
            </h2>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Entity name" required className="field-input" />
            <select value={entityType} onChange={(e) => setEntityType(e.target.value as typeof entityType)} className="field-input">
              <option value="company">Company</option>
              <option value="llp">LLP</option>
              <option value="trust">Trust</option>
              <option value="partnership">Partnership</option>
              <option value="huf">HUF</option>
              <option value="other">Other</option>
            </select>
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="field-input">
              <option value="director">Director</option>
              <option value="partner">Partner</option>
              <option value="trustee">Trustee</option>
              <option value="shareholder">Shareholder</option>
              <option value="other">Other</option>
            </select>
            <input type="number" value={shareholding} onChange={(e) => setShareholding(e.target.value)} placeholder="Shareholding %" className="field-input" />
            <input type="number" value={valuation} onChange={(e) => setValuation(e.target.value)} placeholder="Est. valuation (₹)" className="field-input" />
            <input type="date" value={rocDue} onChange={(e) => setRocDue(e.target.value)} className="field-input" />
            <button type="submit" className="w-full h-10 rounded-xl bg-foreground text-background text-sm">Save entity</button>
          </form>
        )}

        <div className="lg:col-span-2">
          {entities.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No legal entities tracked"
              description="Add companies, LLPs, or trusts to monitor ROC filings and holding structure optimisation."
            />
          ) : (
            <div className="space-y-3">
              {entities.map((e) => (
                <article key={e.id} className="glass rounded-2xl p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{e.entityType} · {e.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-wider ${complianceStyle[e.complianceStatus]}`}>
                        {e.complianceStatus.replace("_", " ")}
                      </span>
                      {!isDemo && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Remove entity?")) return;
                            await deleteLegalEntity(e.id);
                            await load();
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 mt-3 text-xs">
                    {e.shareholdingPercent != null && <span>Share: {e.shareholdingPercent}%</span>}
                    {e.estimatedValuation != null && <span>Valuation: {formatInr(e.estimatedValuation)}</span>}
                    {e.rocFilingDue && <span>ROC due: {new Date(e.rocFilingDue).toLocaleDateString("en-IN")}</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
