import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { KeyRound, Lock, Trash2, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/client/PageHeader";
import {
  deleteAiMemory,
  fetchAiMemoryStatus,
  fetchMemberProfile,
  fetchPrivacyAudit,
  updateMemberProfile,
} from "@/lib/member/client";
import type { PrivacyAuditEntry } from "@/lib/privacy/types";
import { Route as AppRoute } from "@/routes/_app";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile & Settings — Aurelius" }] }),
  component: ProfilePage,
});

const ACTION_LABELS: Record<PrivacyAuditEntry["action"], string> = {
  ai_chat: "AI chat",
  ai_analyze: "Document analysis",
  ai_wealth_parse: "Wealth document parse",
  ai_intelligence: "Intelligence brief",
  memory_read: "Memory read",
  memory_write: "Memory updated",
  memory_delete: "Memory cleared",
};

function ProfilePage() {
  const { session } = AppRoute.useRouteContext();
  const [fullName, setFullName] = useState(session.fullName);
  const [email, setEmail] = useState(session.email);
  const [profession, setProfession] = useState("");
  const [firm, setFirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState<PrivacyAuditEntry[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [clearingMemory, setClearingMemory] = useState(false);

  useEffect(() => {
    fetchMemberProfile()
      .then((r) => {
        setFullName(r.profile.fullName);
        setEmail(r.profile.email);
        setProfession((r.profile as { profession?: string }).profession ?? "");
        setFirm((r.profile as { firm?: string }).firm ?? "");
      })
      .catch(() => {});

    fetchPrivacyAudit()
      .then((r) => setAudit(r.entries))
      .catch(() => {});

    fetchAiMemoryStatus()
      .then((r) => setMemoryCount(r.entryCount))
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMemberProfile(fullName);
      toast.success("Profile updated.");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearMemory() {
    if (!confirm("Delete all AI memory? Aurelius will no longer reference past conversations until you interact again.")) {
      return;
    }
    setClearingMemory(true);
    try {
      await deleteAiMemory();
      setMemoryCount(0);
      const { entries } = await fetchPrivacyAudit();
      setAudit(entries);
      toast.success("AI memory cleared from your private vault.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear memory.");
    } finally {
      setClearingMemory(false);
    }
  }

  return (
    <div className="p-5 lg:p-10 max-w-[1440px] mx-auto">
      <PageHeader title="Profile & Settings" subtitle="Manage your private office identity, security, and AI privacy." />

      <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
        <form onSubmit={handleSave} className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg flex items-center gap-2">
            <User className="h-4 w-4" /> Identity
          </h2>
          <div>
            <label className="text-xs text-muted-foreground">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="field-input mt-1" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <input value={email} disabled className="field-input mt-1 opacity-60 cursor-not-allowed" />
            <p className="text-[10px] text-muted-foreground mt-1">Email is tied to your invitation and cannot be changed.</p>
          </div>
          {(profession || firm) && (
            <div className="pt-2 space-y-1 text-xs text-muted-foreground">
              {profession && <p>Profession: <span className="text-foreground">{profession}</span></p>}
              {firm && <p>Organisation: <span className="text-foreground">{firm}</span></p>}
            </div>
          )}
          <button type="submit" disabled={saving} className="h-10 px-6 rounded-xl bg-foreground text-background text-sm">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <section className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Security
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Update your password through the secure reset flow. A verification link will be sent to your registered email.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex text-sm hairline rounded-full px-4 py-2 hover:bg-muted/40 transition-colors"
          >
            Reset password
          </Link>
          <div className="pt-4 border-t border-border/30 text-xs text-muted-foreground">
            <p>Tier: <span className="text-foreground capitalize">{session.tier.replace("-", " ")}</span></p>
            <p className="mt-1">Session: Encrypted · HttpOnly cookie · TLS in transit</p>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 space-y-4 lg:col-span-2">
          <h2 className="font-display text-lg flex items-center gap-2">
            <Lock className="h-4 w-4 text-success" /> Privacy & AI Memory
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your data is strictly private. AI memory stores wealth context, goals, document insights, and conversation summaries —
            encrypted at rest (AES-256) in your isolated vault. Aurelius never shares your data with other users or third parties.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs hairline rounded-full px-3 py-1.5">
              {memoryCount} memory {memoryCount === 1 ? "entry" : "entries"}
            </span>
            <button
              type="button"
              onClick={handleClearMemory}
              disabled={clearingMemory || memoryCount === 0 || session.isDemo}
              className="text-xs hairline rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 hover:border-destructive/40 disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
              {clearingMemory ? "Clearing…" : "Delete AI memory"}
            </button>
          </div>

          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 bg-muted/20">
              <p className="text-xs font-medium">AI data access audit</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Only you can see this log.</p>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
              {audit.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground">No AI data access logged yet.</p>
              ) : (
                audit.slice(0, 30).map((entry) => (
                  <div key={entry.id} className="px-4 py-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{ACTION_LABELS[entry.action]}</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1">{entry.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
