import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Shield } from "lucide-react";
import { FounderShell } from "@/components/founder/FounderShell";
import { createFounderAdmin, fetchFounderOverview, updateFounderMember } from "@/lib/founder/client";
import type { PublicMember } from "@/lib/auth/types";

export const Route = createFileRoute("/_app/founder/settings")({
  head: () => ({ meta: [{ title: "Settings — Founder" }] }),
  component: FounderSettingsPage,
});

function FounderSettingsPage() {
  const [admins, setAdmins] = useState<PublicMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "", password: "", role: "ADMIN" as "ADMIN" | "member" });
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const data = await fetchFounderOverview();
    setAdmins(data.members.filter((m) => m.role === "ADMIN" || m.role === "SUPER_ADMIN"));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await createFounderAdmin(form);
      setForm({ email: "", fullName: "", password: "", role: "ADMIN" });
      setMessage("Admin account created successfully.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(memberId: string, role: "ADMIN" | "member") {
    setLoading(true);
    try {
      await updateFounderMember(memberId, { role });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Role update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FounderShell title="Founder controls" subtitle="Create admin accounts, manage roles, and platform permissions.">
      <div className="grid lg:grid-cols-2 gap-8">
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-gold" />
            <h2 className="font-display text-xl">Create admin account</h2>
          </div>
          <form onSubmit={handleCreate} className="space-y-3 text-sm">
            <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Full name" required className="field-input" />
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" required className="field-input" />
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password (min 8 chars)" required minLength={8} className="field-input" />
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "member" }))} className="field-input">
              <option value="ADMIN">Admin</option>
              <option value="member">Member (limited)</option>
            </select>
            <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-foreground text-background text-sm inline-flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Create account
            </button>
          </form>
          {message && <p className="mt-4 text-xs text-muted-foreground">{message}</p>}
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Admin & founder accounts</h2>
          <div className="space-y-3">
            {admins.map((a) => (
              <div key={a.id} className="panel-muted rounded-xl p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{a.fullName}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider ${a.role === "SUPER_ADMIN" ? "text-gold" : "text-muted-foreground"}`}>
                    {a.role}
                  </span>
                </div>
                {a.role === "ADMIN" && (
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={loading} onClick={() => changeRole(a.id, "member")} className="text-[11px] text-muted-foreground hover:text-foreground">
                      Demote to member
                    </button>
                  </div>
                )}
                {a.role === "member" && (
                  <button type="button" disabled={loading} onClick={() => changeRole(a.id, "ADMIN")} className="mt-3 text-[11px] text-gold hover:underline">
                    Promote to admin
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="glass rounded-2xl p-6 mt-8 text-sm">
        <h2 className="font-display text-xl mb-3">Environment configuration</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Founder credentials are managed via <code className="text-foreground">AURELIUS_FOUNDER_PASSWORD</code> in your environment.
          Admin panel key: <code className="text-foreground">AURELIUS_ADMIN_KEY</code>. Never commit live secrets to source control.
        </p>
      </section>
    </FounderShell>
  );
}
