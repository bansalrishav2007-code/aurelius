import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Copy, KeyRound, LogOut, Plus, Shield, Trash2, ChevronDown, ChevronUp, Mail, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import {
  adminLogin,
  adminLogout,
  approveWaitlist,
  createAdminInvite,
  declineWaitlist,
  fetchAdminDashboard,
  revokeAdminInvite,
} from "@/lib/auth/client";
import { fetchAdminUsage, revokeMemberAccess } from "@/lib/platform/client";
import type { InviteCode, PublicMember, WaitlistApplication } from "@/lib/auth/types";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Aureliuss" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [superAdminMode, setSuperAdminMode] = useState(false);
  const [key, setKey] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistApplication[]>([]);
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [usage, setUsage] = useState<{ totalEvents: number; byMember: Record<string, { chat: number; upload: number; analyze: number }> } | null>(null);

  const [form, setForm] = useState({
    label: "",
    tier: "principal" as InviteCode["tier"],
    maxUses: 1,
    expiresInDays: 30 as number | null,
    notes: "",
  });
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<{
    inviteCode: string;
    email: string;
    fullName: string;
    emailSent: boolean;
    emailPreview?: { accessUrl: string; inviteCode: string };
    emailNote?: string;
  } | null>(null);
  const [expandedWaitlistId, setExpandedWaitlistId] = useState<string | null>(null);

  async function loadDashboard() {
    const data = await fetchAdminDashboard();
    setInvites(data.invites);
    setWaitlist(data.waitlist);
    setMembers(data.members);
    setMemberCount(data.memberCount);
    setAuthed(true);
    setSuperAdminMode(Boolean(data.superAdminAccess));
    try {
      const u = await fetchAdminUsage();
      setUsage(u);
    } catch {
      setUsage(null);
    }
  }

  useEffect(() => {
    fetchAdminDashboard()
      .then((data) => {
        setInvites(data.invites);
        setWaitlist(data.waitlist);
        setMembers(data.members);
        setMemberCount(data.memberCount);
        setAuthed(true);
        setSuperAdminMode(Boolean(data.superAdminAccess));
      })
      .catch(() => setAuthed(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      await adminLogin(key);
      await loadDashboard();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await adminLogout();
    setAuthed(false);
    setKey("");
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setCreatedCode(null);
    try {
      const { invite } = await createAdminInvite({
        label: form.label || undefined,
        tier: form.tier,
        maxUses: form.maxUses,
        expiresInDays: form.expiresInDays,
        notes: form.notes || undefined,
      });
      setCreatedCode(invite.code);
      await loadDashboard();
      setForm((f) => ({ ...f, label: "", notes: "" }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this invitation? It cannot be used again.")) return;
    await revokeAdminInvite(id);
    await loadDashboard();
  }

  async function handleApproveWaitlist(id: string) {
    setLoading(true);
    setApprovalResult(null);
    try {
      const result = await approveWaitlist(id);
      setApprovalResult({
        inviteCode: result.invite.code,
        email: result.application.email,
        fullName: result.application.fullName,
        emailSent: result.emailSent,
        emailPreview: result.emailPreview,
        emailNote: result.emailNote,
      });
      await loadDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeclineWaitlist(id: string) {
    if (!confirm("Decline this application?")) return;
    await declineWaitlist(id);
    await loadDashboard();
  }

  async function handleRevokeMember(id: string) {
    if (!confirm("Revoke this member's access?")) return;
    await revokeMemberAccess(id);
    await loadDashboard();
  }

  if (!authed) {
    return (
      <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
        <div className="flex-1 grid place-items-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm panel-elevated rounded-3xl p-8"
        >
          <div className="flex items-center gap-2 mb-8">
            <Shield className="h-4 w-4 text-gold" strokeWidth={1.4} />
            <Logo size="sm" />
          </div>
          <h1 className="font-display text-2xl tracking-tight mb-2">Private office admin</h1>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            Restricted to Aureliuss operators. Super Admin founders can access this panel after signing in at{" "}
            <Link to="/login" className="text-foreground hover:underline underline-offset-4">Sign in</Link>
            . Others may use <code className="text-[10px]">AURELIUSS_ADMIN_KEY</code>.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Admin key"
              className="w-full panel-muted rounded-xl h-11 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
            {loginError && <p className="text-xs text-destructive">{loginError}</p>}
            <button
              type="submit"
              disabled={loading || !key}
              className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Authenticating…" : "Enter admin"}
            </button>
          </form>
          <Link to="/" className="block text-center text-xs text-muted-foreground mt-6 hover:text-foreground">
            ← Back to site
          </Link>
        </motion.div>
        </div>
        <PremiumFooter variant="minimal" className="shrink-0" />
      </ImmersiveScene>
    );
  }

  return (
    <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
      <div className="flex-1 py-10 px-6 lg:px-10">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <Logo />
            <div>
              <span className="label-caps">Administration</span>
              {superAdminMode && (
                <p className="text-[10px] text-gold mt-0.5 uppercase tracking-wider">Founder · Super Admin</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </header>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <Stat label="Active members" value={String(memberCount)} />
          <Stat label="Invitations" value={String(invites.length)} />
          <Stat label="Waitlist" value={String(waitlist.length)} />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <section className="panel-elevated rounded-2xl p-6">
            <h2 className="font-display text-xl mb-1">Generate invitation</h2>
            <p className="text-xs text-muted-foreground mb-6">Codes expire automatically unless set to founding (no expiry).</p>
            <form onSubmit={handleCreateInvite} className="space-y-4 text-sm">
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Label (e.g. Mumbai Q2)"
                className="field-input"
              />
              <select
                value={form.tier}
                onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value as InviteCode["tier"] }))}
                className="field-input"
              >
                <option value="founding">Founding circle</option>
                <option value="principal">Principal</option>
                <option value="family-office">Family office</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={1}
                  value={form.maxUses}
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: Number(e.target.value) }))}
                  className="field-input"
                  placeholder="Max uses"
                />
                <select
                  value={form.expiresInDays ?? "none"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      expiresInDays: e.target.value === "none" ? null : Number(e.target.value),
                    }))
                  }
                  className="field-input"
                >
                  <option value="7">Expires in 7 days</option>
                  <option value="30">Expires in 30 days</option>
                  <option value="90">Expires in 90 days</option>
                  <option value="none">No expiry</option>
                </select>
              </div>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Internal notes"
                rows={2}
                className="field-input resize-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium inline-flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Issue invitation
              </button>
            </form>
            {createdCode && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-between gap-3"
              >
                <code className="text-sm tracking-wider">{createdCode}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(createdCode)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Copy code"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </section>

          <section className="panel-elevated rounded-2xl p-6 overflow-hidden">
            <h2 className="font-display text-xl mb-4">Invitation ledger</h2>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {invites.map((inv) => (
                <div key={inv.id} className="panel-muted rounded-xl p-4 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono tracking-wider text-sm">{inv.code}</p>
                      <p className="text-muted-foreground mt-1">
                        {inv.label ?? inv.tier} · {inv.useCount}/{inv.maxUses} uses ·{" "}
                        <span className={inv.status === "active" ? "text-success" : "text-muted-foreground"}>{inv.status}</span>
                      </p>
                      {inv.assignedEmail && (
                        <p className="text-muted-foreground mt-0.5">Issued to {inv.assignedEmail}</p>
                      )}
                      {inv.expiresAt && (
                        <p className="text-muted-foreground mt-0.5">
                          Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {inv.status === "active" && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Revoke"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="panel-elevated rounded-2xl p-6 mt-8">
          <h2 className="font-display text-xl mb-4">Members</h2>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/40">
                    <th className="py-2 pr-4 font-normal">Name</th>
                    <th className="py-2 pr-4 font-normal">Email</th>
                    <th className="py-2 pr-4 font-normal">Role</th>
                    <th className="py-2 pr-4 font-normal">Tier</th>
                    <th className="py-2 pr-4 font-normal">Subscription</th>
                    <th className="py-2 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-border/20">
                      <td className="py-3 pr-4">{m.fullName}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{m.email}</td>
                      <td className="py-3 pr-4">
                        {m.role === "SUPER_ADMIN" ? (
                          <span className="text-gold text-[10px] uppercase tracking-wider">Super Admin</span>
                        ) : (
                          <span className="text-muted-foreground capitalize">{m.role ?? "member"}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 capitalize">{m.tier.replace("-", " ")}</td>
                      <td className="py-3 pr-4 capitalize">
                        {m.subscription ?? "none"}
                        {m.subscriptionPlan ? ` · ${m.subscriptionPlan}` : ""}
                      </td>
                      <td className="py-3">
                        {!m.revoked && m.role !== "SUPER_ADMIN" ? (
                          <button type="button" onClick={() => handleRevokeMember(m.id)} className="text-destructive/80 hover:text-destructive text-[11px] uppercase tracking-wider">
                            Revoke
                          </button>
                        ) : m.role === "SUPER_ADMIN" ? (
                          <span className="text-gold/80 text-[11px]">Permanent</span>
                        ) : (
                          <span className="text-muted-foreground">Revoked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {usage && (
          <section className="panel-elevated rounded-2xl p-6 mt-8">
            <h2 className="font-display text-xl mb-4">AI usage</h2>
            <p className="text-xs text-muted-foreground mb-4">{usage.totalEvents} tracked events</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {Object.entries(usage.byMember).slice(0, 6).map(([email, counts]) => (
                <div key={email} className="panel-muted rounded-xl p-4 text-xs">
                  <p className="truncate text-muted-foreground mb-2">{email}</p>
                  <p>Chat: {counts.chat} · Upload: {counts.upload} · Analyze: {counts.analyze}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="panel-elevated rounded-2xl p-6 mt-8">
          <h2 className="font-display text-xl mb-1 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-gold/80" /> Waitlist applications
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            Review confidential applications. Approval generates a one-time invite code bound to the applicant&apos;s email and sends a private invitation.
          </p>

          {approvalResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-6 rounded-2xl border border-gold/25 bg-gold/5"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gold/15 grid place-items-center shrink-0">
                  <Check className="h-4 w-4 text-gold" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-display text-lg tracking-tight">Membership approved</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {approvalResult.fullName} · {approvalResult.email}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="panel-muted rounded-xl p-4">
                  <p className="label-caps mb-2">Invite code</p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-sm tracking-wider">{approvalResult.inviteCode}</code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(approvalResult.inviteCode)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Copy invite code"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="panel-muted rounded-xl p-4">
                  <p className="label-caps mb-2 flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> Invitation email
                  </p>
                  {approvalResult.emailSent ? (
                    <p className="text-success">Sent to {approvalResult.email}</p>
                  ) : (
                    <div>
                      <p className="text-muted-foreground">{approvalResult.emailNote ?? "Email not sent — configure RESEND_API_KEY"}</p>
                      {approvalResult.emailPreview && (
                        <p className="mt-2 text-[10px] text-muted-foreground break-all">
                          Access link: {approvalResult.emailPreview.accessUrl}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setApprovalResult(null)}
                className="mt-4 text-[11px] text-muted-foreground hover:text-foreground uppercase tracking-wider"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {waitlist.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <div className="space-y-3">
              {waitlist.map((w) => (
                <div key={w.id} className="panel-muted rounded-xl overflow-hidden">
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium tracking-tight">{w.fullName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{w.email} · {w.phone}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                          w.status === "pending"
                            ? "bg-gold/10 text-gold"
                            : w.status === "approved"
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {w.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedWaitlistId(expandedWaitlistId === w.id ? null : w.id)}
                        className="text-muted-foreground hover:text-foreground p-1"
                        aria-label="Toggle details"
                      >
                        {expandedWaitlistId === w.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {expandedWaitlistId === w.id && (
                    <div className="px-4 pb-4 pt-0 border-t border-border/20">
                      <dl className="grid sm:grid-cols-2 gap-3 text-xs mt-4">
                        <div>
                          <dt className="text-muted-foreground">Profession</dt>
                          <dd className="mt-0.5">{w.profession}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Net worth</dt>
                          <dd className="mt-0.5">{w.netWorthBand ?? "Not disclosed"}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-muted-foreground">Why access?</dt>
                          <dd className="mt-0.5 leading-relaxed text-foreground/90">{w.whyAccess}</dd>
                        </div>
                        {w.inviteCode && (
                          <div className="sm:col-span-2">
                            <dt className="text-muted-foreground">Issued code</dt>
                            <dd className="mt-0.5 font-mono tracking-wider">{w.inviteCode}</dd>
                          </div>
                        )}
                        {w.invitationSentAt && (
                          <div>
                            <dt className="text-muted-foreground">Invitation sent</dt>
                            <dd className="mt-0.5">{new Date(w.invitationSentAt).toLocaleString()}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-muted-foreground">Applied</dt>
                          <dd className="mt-0.5">{new Date(w.createdAt).toLocaleString()}</dd>
                        </div>
                      </dl>

                      {w.status === "pending" && (
                        <div className="flex gap-3 mt-4 pt-4 border-t border-border/20">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleApproveWaitlist(w.id)}
                            className="h-9 px-4 rounded-lg bg-foreground text-background text-[11px] uppercase tracking-wider font-medium hover:bg-foreground/90 disabled:opacity-50"
                          >
                            Approve & send invitation
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineWaitlist(w.id)}
                            className="h-9 px-4 rounded-lg hairline text-[11px] uppercase tracking-wider text-muted-foreground hover:text-destructive"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {w.status === "pending" && expandedWaitlistId !== w.id && (
                    <div className="px-4 pb-4 flex gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleApproveWaitlist(w.id)}
                        className="text-success hover:text-success/80 text-[11px] uppercase tracking-wider"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineWaitlist(w.id)}
                        className="text-muted-foreground hover:text-destructive text-[11px] uppercase tracking-wider"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      </div>
      <PremiumFooter variant="minimal" className="shrink-0" />
    </ImmersiveScene>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-muted rounded-2xl p-5">
      <p className="label-caps mb-2">{label}</p>
      <p className="font-display text-3xl tracking-tight">{value}</p>
    </div>
  );
}
