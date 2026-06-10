import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { FounderShell } from "@/components/founder/FounderShell";
import { fetchFounderOverview } from "@/lib/founder/client";
import { createAdminInvite, revokeAdminInvite } from "@/lib/auth/client";
import type { InviteCode } from "@/lib/auth/types";

export const Route = createFileRoute("/_app/founder/invites")({
  head: () => ({ meta: [{ title: "Access Codes — Founder" }] }),
  component: FounderInvitesPage,
});

function FounderInvitesPage() {
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: "",
    tier: "principal" as InviteCode["tier"],
    assignedEmail: "",
    maxUses: 1,
    expiresInDays: 30 as number | null,
    notes: "",
  });

  async function load() {
    const data = await fetchFounderOverview();
    setInvites(data.invites);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const clientEmail = form.assignedEmail.trim().toLowerCase();
    if (!clientEmail.includes("@")) {
      alert("Client email is required. The access code will be bound to this email for onboarding and login.");
      return;
    }
    setLoading(true);
    setCreatedCode(null);
    try {
      const { invite } = await createAdminInvite({
        label: form.label || `Access for ${clientEmail}`,
        tier: form.tier,
        maxUses: form.maxUses,
        expiresInDays: form.expiresInDays,
        assignedEmail: clientEmail,
        notes: form.notes || `Client access · ${clientEmail}`,
      });
      setCreatedCode(invite.code);
      setForm((f) => ({ ...f, label: "", assignedEmail: "", notes: "" }));
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create code");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this access code?")) return;
    await revokeAdminInvite(id);
    await load();
  }

  const active = invites.filter((i) => i.status === "active");
  const used = invites.filter((i) => i.status === "used" || i.status === "expired" || i.status === "revoked");

  return (
    <FounderShell title="Invite & access codes" subtitle="Create, revoke, and monitor invitation and client access codes.">
      <div className="grid lg:grid-cols-2 gap-8">
        <section className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Create access code</h2>
          <form onSubmit={handleCreate} className="space-y-3 text-sm">
            <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Label (optional)" className="field-input" />
            <input
              type="email"
              required
              value={form.assignedEmail}
              onChange={(e) => setForm((f) => ({ ...f, assignedEmail: e.target.value }))}
              placeholder="Client email (required — code is bound to this address)"
              className="field-input"
            />
            <select value={form.tier} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value as InviteCode["tier"] }))} className="field-input">
              <option value="founding">Founding circle</option>
              <option value="principal">Principal</option>
              <option value="family-office">Family office</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" min={1} value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: Number(e.target.value) }))} className="field-input" placeholder="Max uses" />
              <select
                value={form.expiresInDays ?? "none"}
                onChange={(e) => setForm((f) => ({ ...f, expiresInDays: e.target.value === "none" ? null : Number(e.target.value) }))}
                className="field-input"
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="none">No expiry</option>
              </select>
            </div>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Internal notes" rows={2} className="field-input resize-none" />
            <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-foreground text-background text-sm inline-flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Issue code
            </button>
          </form>
            {createdCode && (
              <div className="mt-4 p-4 rounded-xl bg-gold/10 border border-gold/20 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm tracking-wider">{createdCode}</code>
                  <button type="button" onClick={() => navigator.clipboard.writeText(createdCode)}><Copy className="h-4 w-4" /></button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  12-character code · bound to client email. Client visits <strong className="text-foreground">/access</strong>, enters the same email and this code, completes onboarding, then reaches the dashboard.
                </p>
              </div>
            )}
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Active codes ({active.length})</h2>
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {active.map((inv) => (
              <InviteRow key={inv.id} inv={inv} onRevoke={handleRevoke} />
            ))}
            {active.length === 0 && <p className="text-sm text-muted-foreground">No active codes.</p>}
          </div>
        </section>
      </div>

      <section className="glass rounded-2xl p-6 mt-8">
        <h2 className="font-display text-xl mb-4">Used & expired ({used.length})</h2>
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {used.map((inv) => (
            <InviteRow key={inv.id} inv={inv} />
          ))}
        </div>
      </section>
    </FounderShell>
  );
}

function InviteRow({ inv, onRevoke }: { inv: InviteCode; onRevoke?: (id: string) => void }) {
  return (
    <div className="panel-muted rounded-xl p-4 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono tracking-wider text-sm">{inv.code}</p>
          <p className="text-muted-foreground mt-1">
            {inv.label ?? inv.tier} · {inv.useCount}/{inv.maxUses} · <span className="capitalize">{inv.status}</span>
          </p>
          {inv.assignedEmail && <p className="text-muted-foreground mt-0.5">→ {inv.assignedEmail}</p>}
          {inv.expiresAt && <p className="text-muted-foreground mt-0.5">Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>}
        </div>
        {inv.status === "active" && onRevoke && (
          <button type="button" onClick={() => onRevoke(inv.id)} className="text-muted-foreground hover:text-destructive p-1">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
