import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Crown,
  Loader2,
  Search,
  Shield,
  X,
  ToggleLeft,
  ToggleRight,
  Users,
  ClipboardList,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { adminLogin, adminLogout, fetchAdminDashboard } from "@/lib/auth/client";
import {
  approveMembershipApplication,
  fetchAdminApplications,
  rejectMembershipApplication,
  updateAdminInviteOnlyMode,
  updateAdminMember,
} from "@/lib/membership/client";
import type { AdminActivityEntry, InviteCode, MembershipApplication, PublicMember } from "@/lib/auth/types";
import { TIER_LABELS } from "@/lib/membership/access";

export const Route = createFileRoute("/admin/applications")({
  head: () => ({ meta: [{ title: "Membership Admin — Aurelius" }] }),
  component: AdminApplicationsPage,
});

const statusColors = {
  pending: "text-amber-400 bg-amber-400/10",
  approved: "text-success bg-success/10",
  rejected: "text-destructive bg-destructive/10",
};

function AdminApplicationsPage() {
  const [authed, setAuthed] = useState(false);
  const [key, setKey] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [byTier, setByTier] = useState({ principal: 0, "family-office": 0, founding: 0 });
  const [pendingCount, setPendingCount] = useState(0);
  const [activity, setActivity] = useState<AdminActivityEntry[]>([]);
  const [inviteOnly, setInviteOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadAll() {
    const [dash, apps] = await Promise.all([fetchAdminDashboard(), fetchAdminApplications()]);
    setMembers(dash.members);
    setInviteOnly(dash.inviteOnlyMode ?? true);
    setApplications(apps.applications);
    setByTier(apps.byTier);
    setPendingCount(apps.pendingApplications);
    setActivity(apps.recentActivity);
    setAuthed(true);
  }

  useEffect(() => {
    fetchAdminDashboard()
      .then(() => loadAll())
      .catch(() => setAuthed(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      await adminLogin(key);
      await loadAll();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.tier.includes(q),
    );
  }, [members, search]);

  async function handleApprove(id: string, tier?: InviteCode["tier"]) {
    setActionLoading(id);
    try {
      await approveMembershipApplication(id, { tier });
      await loadAll();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    try {
      await rejectMembershipApplication(id);
      await loadAll();
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleInviteOnly() {
    const next = !inviteOnly;
    await updateAdminInviteOnlyMode(next);
    setInviteOnly(next);
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="glass rounded-2xl p-8 w-full max-w-sm space-y-4">
          <Logo className="mx-auto h-8 mb-2" />
          <h1 className="font-display text-xl text-center">Admin access</h1>
          <input
            type="password"
            className="field-input"
            placeholder="Admin key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          {loginError && <p className="text-sm text-destructive">{loginError}</p>}
          <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-foreground text-background text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo className="h-7" />
          <span className="text-sm text-muted-foreground">Membership admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground">
            Legacy admin
          </Link>
          <button onClick={() => adminLogout().then(() => setAuthed(false))} className="text-xs text-muted-foreground">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["principal", "family-office", "founding"] as const).map((tier) => (
            <div key={tier} className="glass rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{TIER_LABELS[tier]}</p>
              <p className="font-display text-2xl mt-1">{byTier[tier]}</p>
            </div>
          ))}
          <div className="glass rounded-xl p-4 border border-gold/20">
            <p className="text-[10px] uppercase tracking-wider text-gold">Pending applications</p>
            <p className="font-display text-2xl mt-1 text-gold">{pendingCount}</p>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gold" />
            <div>
              <p className="text-sm font-medium">Invite-only mode</p>
              <p className="text-xs text-muted-foreground">
                {inviteOnly ? "ON — /apply shows waitlist form only" : "OFF — full application form visible"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleInviteOnly}
            className="inline-flex items-center gap-2 text-sm text-gold"
          >
            {inviteOnly ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
            {inviteOnly ? "Turn OFF" : "Turn ON"}
          </button>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-4 w-4 text-gold" />
            <h2 className="font-display text-xl">Applications</h2>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="p-4">Applicant</th>
                  <th className="p-4 hidden md:table-cell">Tier</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 hidden lg:table-cell">Submitted</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">No applications yet.</td>
                  </tr>
                )}
                {applications.map((app) => (
                  <tr
                      key={app.id}
                      className="border-b border-border/20 hover:bg-muted/20 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    >
                      <td className="p-4">
                        <p className="font-medium">{app.fullName}</p>
                        <p className="text-xs text-muted-foreground">{app.email}</p>
                      </td>
                      <td className="p-4 hidden md:table-cell">{TIER_LABELS[app.tierApplying]}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColors[app.status]}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-4 hidden lg:table-cell text-muted-foreground">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {app.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleApprove(app.id, app.tierApplying)}
                              disabled={actionLoading === app.id}
                              className="h-8 px-3 rounded-lg bg-success/15 text-success text-xs inline-flex items-center gap-1"
                            >
                              {actionLoading === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              disabled={actionLoading === app.id}
                              className="h-8 px-3 rounded-lg bg-destructive/15 text-destructive text-xs inline-flex items-center gap-1"
                            >
                              <X className="h-3 w-3" /> Reject
                            </button>
                          </div>
                        )}
                        <ChevronDown className={`h-4 w-4 ml-auto inline ${expandedId === app.id ? "rotate-180" : ""}`} />
                      </td>
                    </tr>
                ))}
                {applications.filter((a) => expandedId === a.id).map((app) => (
                  <tr key={`${app.id}-detail`} className="bg-muted/10">
                    <td colSpan={5} className="p-4 text-xs text-muted-foreground space-y-1">
                      <p>Phone: {app.phone}</p>
                      <p>Net worth: {app.netWorthRange}</p>
                      <p>Primary need: {app.primaryNeed}</p>
                      {app.hearAbout && <p>Heard via: {app.hearAbout}</p>}
                      <p className="text-foreground mt-2">{app.whyAccess}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gold" />
              <h2 className="font-display text-xl">Members</h2>
            </div>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="field-input pl-9 h-9 text-sm w-56"
                placeholder="Search name / email / tier"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="glass rounded-2xl divide-y divide-border/30">
            {filteredMembers.map((m) => (
              <div key={m.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{m.fullName}</p>
                  <p className="text-xs text-muted-foreground">{m.email} · {TIER_LABELS[m.tier]}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="field-input h-8 text-xs w-36"
                    value={m.tier}
                    onChange={(e) =>
                      updateAdminMember(m.id, { tier: e.target.value as InviteCode["tier"] }).then(loadAll)
                    }
                  >
                    <option value="principal">Principal</option>
                    <option value="family-office">Family Office</option>
                    <option value="founding">Founder</option>
                  </select>
                  <button
                    onClick={() =>
                      updateAdminMember(m.id, { suspended: !m.revoked }).then(loadAll)
                    }
                    className={`h-8 px-3 rounded-lg text-xs ${m.revoked ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
                  >
                    {m.revoked ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-4 w-4 text-gold" />
            <h2 className="font-display text-xl">Recent activity</h2>
          </div>
          <div className="glass rounded-2xl p-4 space-y-2 max-h-64 overflow-y-auto">
            {activity.length === 0 && <p className="text-sm text-muted-foreground">No activity logged yet.</p>}
            {activity.map((a) => (
              <div key={a.id} className="text-xs flex justify-between gap-4 py-2 border-b border-border/20 last:border-0">
                <span className="text-muted-foreground">{a.action.replace(/_/g, " ")}</span>
                <span className="text-foreground text-right flex-1">{a.detail}</span>
                <span className="text-muted-foreground shrink-0">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
