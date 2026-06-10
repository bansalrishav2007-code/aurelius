import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Sparkles, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { EmptyState } from "@/components/client/EmptyState";
import { LastUpdated } from "@/components/client/LastUpdated";
import { TierGate } from "@/components/membership/TierGate";
import { DemoFeatureLock } from "@/components/demo/DemoFeatureLock";
import {
  deleteFamilyMember,
  fetchFamilyMembers,
  upsertFamilyMember,
} from "@/lib/member/client";
import { formatInr } from "@/lib/wealth/calculations";
import type { FamilyMember } from "@/lib/family/types";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/dashboard/family-members")({
  head: () => ({ meta: [{ title: "Family Members — Aurelius" }] }),
  component: FamilyMembersDashboardPage,
});

function FamilyMembersDashboardPage() {
  const { session } = AppRoute.useRouteContext();
  return (
    <TierGate session={session} feature="family_members" title="Family Members">
      <FamilyMembersContent isDemo={session.isDemo === true} />
    </TierGate>
  );
}

function FamilyMembersContent({ isDemo }: { isDemo: boolean }) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [netWorth, setNetWorth] = useState(0);
  const [insights, setInsights] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [pan, setPan] = useState("");
  const [dob, setDob] = useState("");
  const [accessLevel, setAccessLevel] = useState<"view" | "full">("view");
  const [unused80C, setUnused80C] = useState("");

  async function load() {
    const data = await fetchFamilyMembers();
    setMembers(data.members);
    setNetWorth(data.familyNetWorth);
    setInsights(data.aiInsights);
    setUpdatedAt(data.updatedAt);
  }

  useEffect(() => {
    load()
      .catch(() => toast.error("Unable to load family members."))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !relation.trim()) return;
    try {
      await upsertFamilyMember({
        name,
        relation,
        pan: pan || undefined,
        dob: dob || undefined,
        accessLevel,
        unused80CLimit: unused80C ? Number(unused80C) : undefined,
      });
      setName("");
      setRelation("");
      setPan("");
      setDob("");
      setUnused80C("");
      await load();
      toast.success("Family member added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
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
      <PageHeader
        title="Family Members"
        subtitle="Model combined family wealth, access levels, and cross-member tax optimisation."
      >
        <LastUpdated iso={updatedAt} />
      </PageHeader>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Combined family net worth</p>
          <p className="font-display text-2xl mt-1">{formatInr(netWorth)}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Family members</p>
          <p className="font-display text-2xl mt-1">{members.length}</p>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-8 space-y-2">
          <h2 className="font-display text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" /> AI tax insights
          </h2>
          {insights.map((tip) => (
            <p key={tip} className="text-sm text-muted-foreground">{tip}</p>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {isDemo ? (
          <DemoFeatureLock title="Family editing locked in demo" description="Preview combined wealth view only." className="lg:col-span-1" />
        ) : (
          <form onSubmit={handleAdd} className="glass rounded-2xl p-6 space-y-3 lg:col-span-1">
            <h2 className="font-display text-lg flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add member
            </h2>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required className="field-input" />
            <input value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="Relation (spouse, child…)" required className="field-input" />
            <input value={pan} onChange={(e) => setPan(e.target.value)} placeholder="PAN (optional)" className="field-input" />
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="field-input" />
            <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value as typeof accessLevel)} className="field-input">
              <option value="view">View only</option>
              <option value="full">Full access</option>
            </select>
            <input type="number" value={unused80C} onChange={(e) => setUnused80C(e.target.value)} placeholder="Unused 80C limit (₹)" className="field-input" />
            <button type="submit" className="w-full h-10 rounded-xl bg-foreground text-background text-sm">Save member</button>
          </form>
        )}

        <div className="lg:col-span-2">
          {members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No family members added"
              description="Add spouse, children, or parents to model combined wealth and flag unused 80C limits."
            />
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="glass rounded-2xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.relation} · {m.accessLevel === "full" ? "Full access" : "View only"}</p>
                    {m.pan && <p className="text-[10px] text-muted-foreground mt-1">PAN: {m.pan}</p>}
                    {(m.unused80CLimit ?? 0) > 0 && (
                      <p className="text-[10px] text-gold mt-1">Unused 80C: {formatInr(m.unused80CLimit!)}</p>
                    )}
                  </div>
                  {!isDemo && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Remove this member?")) return;
                        await deleteFamilyMember(m.id);
                        await load();
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
