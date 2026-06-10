import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { FounderShell } from "@/components/founder/FounderShell";
import { deleteFounderMember, fetchFounderOverview, updateFounderMember } from "@/lib/founder/client";
import type { PublicMember } from "@/lib/auth/types";

export const Route = createFileRoute("/_app/founder/clients")({
  head: () => ({ meta: [{ title: "Clients — Founder" }] }),
  component: FounderClientsPage,
});

function FounderClientsPage() {
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await fetchFounderOverview();
    setMembers(data.members);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (!q) return true;
      return m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });
  }, [members, search]);

  async function handleUpdate(id: string, updates: Parameters<typeof updateFounderMember>[1]) {
    setLoading(true);
    try {
      await updateFounderMember(id, updates);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this client account?")) return;
    setLoading(true);
    try {
      await deleteFounderMember(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FounderShell title="Client management" subtitle="View, suspend, upgrade, downgrade, and manage all platform members.">
      <div className="relative max-w-md mb-6">
        <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients…" className="w-full field-input pl-9" />
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                <th className="py-3 px-4 font-normal">Name</th>
                <th className="py-3 px-4 font-normal">Email</th>
                <th className="py-3 px-4 font-normal">Tier</th>
                <th className="py-3 px-4 font-normal">Role</th>
                <th className="py-3 px-4 font-normal">Subscription</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 px-4 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-border/20">
                  <td className="py-3 px-4">{m.fullName}</td>
                  <td className="py-3 px-4 text-muted-foreground">{m.email}</td>
                  <td className="py-3 px-4">
                    {m.role === "SUPER_ADMIN" ? (
                      <span className="text-gold">Founding</span>
                    ) : (
                      <select
                        value={m.tier}
                        disabled={loading || m.role === "SUPER_ADMIN"}
                        onChange={(e) => handleUpdate(m.id, { tier: e.target.value as PublicMember["tier"] })}
                        className="bg-transparent border-0 text-xs capitalize"
                      >
                        <option value="founding">Founding</option>
                        <option value="principal">Principal</option>
                        <option value="family-office">Family office</option>
                      </select>
                    )}
                  </td>
                  <td className="py-3 px-4 capitalize">{m.role ?? "member"}</td>
                  <td className="py-3 px-4">
                    {m.role === "SUPER_ADMIN" ? (
                      <span className="text-success">Active</span>
                    ) : (
                      <select
                        value={m.subscription ?? "none"}
                        disabled={loading}
                        onChange={(e) => handleUpdate(m.id, { subscription: e.target.value as PublicMember["subscription"] })}
                        className="bg-transparent border-0 text-xs capitalize"
                      >
                        <option value="none">None</option>
                        <option value="active">Active</option>
                        <option value="past_due">Past due</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {m.revoked ? (
                      <span className="text-destructive">Suspended</span>
                    ) : (
                      <span className="text-success">Active</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {m.role !== "SUPER_ADMIN" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleUpdate(m.id, { revoked: !m.revoked })}
                          className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                        >
                          {m.revoked ? "Restore" : "Suspend"}
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleDelete(m.id)}
                          className="text-destructive/80 hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground">No clients found.</p>}
      </div>
    </FounderShell>
  );
}
