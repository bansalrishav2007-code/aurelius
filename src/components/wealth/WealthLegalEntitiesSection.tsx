import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Plus, Sparkles } from "lucide-react";
import { formatInr } from "@/lib/wealth/calculations";
import type { LegalEntity } from "@/lib/wealth/types";

const statusStyle = {
  compliant: "text-success",
  due_soon: "text-gold",
  overdue: "text-destructive",
};

export function WealthLegalEntitiesSection({
  entities,
  isDemo,
  onSave,
}: {
  entities: LegalEntity[];
  isDemo?: boolean;
  onSave?: (input: Partial<LegalEntity> & { name: string }) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("Private Ltd");
  const [role, setRole] = useState("Director");
  const [share, setShare] = useState("");
  const [value, setValue] = useState("");
  const [rocDue, setRocDue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !onSave) return;
    setSaving(true);
    try {
      await onSave({
        name,
        entityType,
        role,
        shareholdingPercent: share ? Number(share) : undefined,
        value: value ? Number(value) : undefined,
        rocFilingDue: rocDue || undefined,
      });
      setName("");
      setShare("");
      setValue("");
      setRocDue("");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  const upcoming = entities.filter((e) => e.complianceStatus === "due_soon" || e.complianceStatus === "overdue");

  return (
    <section className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Legal entities</h2>
        {!isDemo && onSave && (
          <button type="button" onClick={() => setShowForm(!showForm)} className="text-xs text-gold inline-flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Add entity
          </button>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="rounded-xl border border-gold/20 bg-gold/5 p-3 text-xs space-y-1">
          <p className="font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-gold" /> AI compliance flags</p>
          {upcoming.map((e) => (
            <p key={e.id} className="text-muted-foreground">{e.name}: {e.complianceStatus?.replace("_", " ")}</p>
          ))}
        </div>
      )}

      {showForm && !isDemo && (
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3 rounded-xl border border-border/60 p-4">
          <input className="field-input" placeholder="Entity name" value={name} onChange={(e) => setName(e.target.value)} required />
          <select className="field-input" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            {["Private Ltd", "LLP", "Trust", "HUF", "Partnership"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select className="field-input" value={role} onChange={(e) => setRole(e.target.value)}>
            {["Director", "Partner", "Trustee", "Promoter"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input className="field-input" type="number" placeholder="Shareholding %" value={share} onChange={(e) => setShare(e.target.value)} />
          <input className="field-input" type="number" placeholder="Valuation (₹)" value={value} onChange={(e) => setValue(e.target.value)} />
          <input type="date" className="field-input" value={rocDue} onChange={(e) => setRocDue(e.target.value)} />
          <button type="submit" disabled={saving} className="sm:col-span-2 h-10 rounded-xl bg-foreground text-background text-sm">Save entity</button>
        </form>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entities.map((entity) => (
          <div key={entity.id} className="rounded-xl border border-border/60 p-4">
            <div className="flex justify-between gap-2">
              <p className="font-medium text-sm">{entity.name}</p>
              {entity.aiExtracted && (
                <span className="text-[10px] text-gold inline-flex items-center gap-0.5">
                  <Sparkles className="h-2.5 w-2.5" /> AI
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{entity.entityType} · {entity.role}</p>
            {entity.shareholdingPercent != null && <p className="text-xs mt-1">{entity.shareholdingPercent}% holding</p>}
            {entity.value != null && <p className="text-sm text-gold mt-2 tabular-nums">{formatInr(entity.value)}</p>}
            <p className={`text-[10px] uppercase tracking-wider mt-2 ${statusStyle[entity.complianceStatus ?? "compliant"]}`}>
              {entity.complianceStatus?.replace("_", " ") ?? "compliant"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Updated {formatDistanceToNow(new Date(entity.updatedAt), { addSuffix: true })}
            </p>
          </div>
        ))}
        {entities.length === 0 && (
          <p className="text-sm text-muted-foreground sm:col-span-2">Add companies, LLPs, or trusts to track compliance.</p>
        )}
      </div>
    </section>
  );
}
