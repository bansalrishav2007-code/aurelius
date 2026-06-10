import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FounderShell, FounderStat } from "@/components/founder/FounderShell";
import {
  createFounderExpert,
  deleteFounderExpert,
  fetchFounderExperts,
  updateFounderExpert,
} from "@/lib/experts/client";
import { formatInr } from "@/lib/experts/pricing";
import { EXPERT_CATEGORY_LABELS, type ExpertCategory, type ExpertProfile } from "@/lib/experts/types";

export const Route = createFileRoute("/_app/founder/experts")({
  head: () => ({ meta: [{ title: "Experts — Founder" }] }),
  component: FounderExpertsPage,
});

const categories = Object.entries(EXPERT_CATEGORY_LABELS) as [ExpertCategory, string][];

function FounderExpertsPage() {
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [revenue, setRevenue] = useState({ totalRevenuePaise: 0, activeExperts: 0, pendingBookings: 0, completedConsultations: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "chartered-accountant" as ExpertCategory,
    yearsExperience: 5,
    specialization: "",
    languages: "English, Hindi",
    pricePaise: 249900,
    exclusiveOnly: false,
    portalEmail: "",
    portalPassword: "Expert2026!",
    bio: "",
  });

  async function load() {
    const data = await fetchFounderExperts();
    setExperts(data.experts);
    setRevenue(data.revenue);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  function resetForm() {
    setForm({
      name: "",
      category: "chartered-accountant",
      yearsExperience: 5,
      specialization: "",
      languages: "English, Hindi",
      pricePaise: 249900,
      exclusiveOnly: false,
      portalEmail: "",
      portalPassword: "Expert2026!",
      bio: "",
    });
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(expert: ExpertProfile) {
    setEditing(expert);
    setForm({
      name: expert.name,
      category: expert.category,
      yearsExperience: expert.yearsExperience,
      specialization: expert.specialization,
      languages: expert.languages.join(", "),
      pricePaise: expert.pricePaise,
      exclusiveOnly: expert.exclusiveOnly,
      portalEmail: expert.portalEmail,
      portalPassword: "",
      bio: expert.bio ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        name: form.name,
        category: form.category,
        yearsExperience: form.yearsExperience,
        specialization: form.specialization,
        languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
        pricePaise: form.pricePaise,
        exclusiveOnly: form.exclusiveOnly,
        portalEmail: form.portalEmail,
        portalPassword: form.portalPassword || undefined,
        bio: form.bio,
      };
      if (editing) {
        await updateFounderExpert(editing.id, body);
      } else {
        if (!form.portalPassword) throw new Error("Portal password required for new experts.");
        await createFounderExpert({ ...body, portalPassword: form.portalPassword });
      }
      resetForm();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this expert from the marketplace?")) return;
    setLoading(true);
    try {
      await deleteFounderExpert(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FounderShell
      title="Expert marketplace"
      subtitle="Add, edit, and manage chartered accountants, lawyers, and financial advisors on the Aurelius advisory network."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <FounderStat label="Consultation revenue" value={formatInr(revenue.totalRevenuePaise)} />
        <FounderStat label="Active experts" value={String(revenue.activeExperts)} />
        <FounderStat label="Pending bookings" value={String(revenue.pendingBookings)} />
        <FounderStat label="Completed" value={String(revenue.completedConsultations)} />
      </div>

      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{experts.length} experts in directory</p>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-xs font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Add expert
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 mb-8 space-y-4">
          <p className="font-medium text-sm">{editing ? "Edit expert" : "New expert"}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <input className="field-input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select className="field-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpertCategory })}>
              {categories.map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input className="field-input" type="number" placeholder="Years experience" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: Number(e.target.value) })} />
            <input className="field-input" type="number" placeholder="Price (paise)" value={form.pricePaise} onChange={(e) => setForm({ ...form, pricePaise: Number(e.target.value) })} />
            <input className="field-input sm:col-span-2" placeholder="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
            <input className="field-input" placeholder="Languages (comma-separated)" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} />
            <input className="field-input" placeholder="Portal email" value={form.portalEmail} onChange={(e) => setForm({ ...form, portalEmail: e.target.value })} required />
            <input className="field-input" type="password" placeholder={editing ? "New portal password (optional)" : "Portal password"} value={form.portalPassword} onChange={(e) => setForm({ ...form, portalPassword: e.target.value })} />
            <textarea className="field-input sm:col-span-2 min-h-[60px]" placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.exclusiveOnly} onChange={(e) => setForm({ ...form, exclusiveOnly: e.target.checked })} />
            Exclusive to premium members only
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="h-9 px-4 rounded-lg bg-foreground text-background text-xs font-medium">
              {editing ? "Save changes" : "Create expert"}
            </button>
            <button type="button" onClick={resetForm} className="h-9 px-4 rounded-lg hairline text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                <th className="py-3 px-4 font-normal">Name</th>
                <th className="py-3 px-4 font-normal">Category</th>
                <th className="py-3 px-4 font-normal">Price</th>
                <th className="py-3 px-4 font-normal">Portal</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 px-4 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {experts.map((e) => (
                <tr key={e.id} className="border-b border-border/20">
                  <td className="py-3 px-4">{e.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{e.profession}</td>
                  <td className="py-3 px-4">{formatInr(e.pricePaise)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{e.portalEmail}</td>
                  <td className="py-3 px-4 capitalize">{e.status}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(e)} className="text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(e.id)} disabled={loading || e.status === "inactive"} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FounderShell>
  );
}
