import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Sparkles,
  ArrowUpRight,
  MessageSquare,
  ArrowRight,
  Activity,
  Target,
  LifeBuoy,
  FolderLock,
  Landmark,
  Settings,
  BadgeCheck,
  Lock,
  BarChart3,
  Calculator,
} from "lucide-react";
import { TrustStrip } from "@/components/TrustStrip";
import { DemoAiPanel } from "@/components/demo/DemoAiPanel";
import { DemoLockedTile } from "@/components/demo/DemoLockedTile";
import { DemoModeBadge } from "@/components/demo/DemoModeBadge";
import type { PublicSession } from "@/lib/auth/types";
import { DEMO_AI_QUOTA_DAILY } from "@/lib/demo/constants";
import { DEMO_LOCK_MESSAGE } from "@/lib/demo/messages";
import { DemoLockedModuleCard } from "@/components/demo/DemoLockedModuleCard";
import {
  demoAdvisorNotes,
  demoLockedModules,
  demoPortfolioOverview,
  demoTaxInsights,
} from "@/lib/demo/workspace-data";
import { fetchMemberOverview, type MemberOverview } from "@/lib/member/client";
import { formatInr } from "@/lib/wealth/calculations";
import { loadActivity, logActivity, sortModulesByUsage, trackModuleClick } from "@/lib/dashboard/activity";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return <Outlet />;
}

function firstName(fullName: string) {
  return fullName.split(/\s+/)[0] ?? "Principal";
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const workspaceHubBase = [
  { to: "/dashboard/wealth-overview", label: "Wealth Overview", desc: "Portfolio & tax insights", icon: Landmark, demoAction: "insights" as const },
  { to: "/dashboard/market-intel", label: "Market Intel", desc: "News & macro briefing", icon: BarChart3, demoAction: "locked" as const },
  { to: "/dashboard/tax-calculator", label: "Tax Calculator", desc: "FY 2025-26 planning", icon: Calculator, demoAction: "locked" as const },
  { to: "/chat", label: "AI Advisor", desc: "Private financial copilot", icon: MessageSquare, demoAction: "ai" as const },
  { to: "/vault", label: "Vault", desc: "Encrypted documents", icon: FolderLock, demoAction: "locked" as const },
  { to: "/goals", label: "Goals", desc: "Planning & milestones", icon: Target, demoAction: "locked" as const },
  { to: "/dashboard/documents", label: "Documents", desc: "Indexed vault files", icon: FileText, demoAction: "locked" as const },
  { to: "/membership", label: "Membership", desc: "Tier & benefits", icon: BadgeCheck, demoAction: "locked" as const },
  { to: "/profile", label: "Settings", desc: "Profile & security", icon: Settings, demoAction: "locked" as const },
  { to: "/support", label: "Support", desc: "Private office help", icon: LifeBuoy, demoAction: "locked" as const },
] as const;

const tierLabels = {
  founding: "Founding circle",
  principal: "Principal · Tier I",
  "family-office": "Family office charter",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}

function scrollToDemoSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type DashboardContentProps = {
  session: PublicSession;
  demoWorkspace?: boolean;
};

export function DashboardContent({ session, demoWorkspace = false }: DashboardContentProps) {
  const name = session.firstName ?? firstName(session.fullName);
  const isDemo = demoWorkspace || session.isDemo === true;
  const [overview, setOverview] = useState<MemberOverview | null>(null);
  const quotaDaily = session.aiQuotaDaily ?? DEMO_AI_QUOTA_DAILY;

  useEffect(() => {
    fetchMemberOverview()
      .then(setOverview)
      .catch(() => {});
    if (!demoWorkspace) {
      logActivity({ type: "page_visit", label: "Dashboard", detail: "Visited command centre" });
    }
  }, [demoWorkspace]);

  const workspaceHub = sortModulesByUsage([...workspaceHubBase]);

  const stats = overview?.stats ?? {
    documentCount: demoWorkspace ? 5 : 0,
    conversationCount: demoWorkspace ? 3 : 0,
    activeGoals: demoWorkspace ? 3 : 0,
    openTickets: 0,
  };

  const subtitle = demoWorkspace
    ? "You are viewing a curated preview of the Aurelius private operating system — institutional-grade intelligence, sample data only."
    : stats.documentCount > 0
      ? `${stats.documentCount} document${stats.documentCount === 1 ? "" : "s"} in vault · ${stats.conversationCount} AI session${stats.conversationCount === 1 ? "" : "s"}`
      : "Upload documents to your vault and ask the AI Advisor to begin personalised guidance.";

  const localActivity = loadActivity().map((a) => ({
    key: a.id,
    title: a.label,
    detail: a.detail ?? a.type.replace("_", " "),
    when: formatWhen(a.at),
    to: "/dashboard" as const,
  }));

  const activity = [
    ...localActivity,
    ...((overview?.recentConversations ?? []).map((c) => ({
      key: `chat-${c.id}`,
      title: "AI conversation",
      detail: c.title,
      when: formatWhen(c.updatedAt),
      to: "/chat" as const,
    })) ?? []),
    ...((overview?.recentDocuments ?? []).map((d) => ({
      key: `doc-${d.id}`,
      title: "Document uploaded",
      detail: d.name,
      when: formatWhen(d.uploadedAt),
      to: "/dashboard/documents" as const,
    })) ?? []),
  ].slice(0, 5);

  return (
    <div className={`relative ${demoWorkspace ? "demo-workspace" : ""}`}>
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
      <div className="relative p-5 lg:p-10 max-w-[1440px] mx-auto">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              <p className="demo-section-eyebrow">
                {isDemo ? "Private operating system · Preview environment" : `Private Workspace · ${tierLabels[session.tier]}`}
              </p>
              {isDemo && <DemoModeBadge compact />}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
              {isDemo ? (
                <>
                  Welcome, <span className="gold-text">{name}</span>
                </>
              ) : (
                `${greeting()}, ${name}.`
              )}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl leading-relaxed">{subtitle}</p>
            {demoWorkspace && session.demoPurpose && (
              <p className="text-xs text-muted-foreground/75 mt-2 tracking-wide">
                Principal focus · <span className="text-foreground/80">{session.demoPurpose}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {demoWorkspace ? (
              <>
                <button
                  type="button"
                  disabled
                  title={DEMO_LOCK_MESSAGE}
                  className="btn-secondary btn-sm btn-pill demo-btn-locked"
                >
                  <FolderLock className="h-3.5 w-3.5" /> Open vault
                </button>
                <button
                  type="button"
                  onClick={() => scrollToDemoSection("demo-ai-advisor")}
                  className="btn-primary btn-sm btn-pill"
                >
                  <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.8} /> Ask Aurelius
                </button>
              </>
            ) : (
              <>
                <Link to="/vault" className="btn-secondary btn-sm btn-pill">
                  <FolderLock className="h-3.5 w-3.5" /> Open vault
                </Link>
                <Link to="/chat" className="btn-primary btn-sm btn-pill">
                  <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.8} /> Ask Aurelius
                </Link>
              </>
            )}
          </div>
        </motion.header>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="mb-7">
          <TrustStrip />
        </motion.div>

        {!demoWorkspace && (
          <Stagger className="mb-6" delay={0.08}>
            <div className="glass rounded-2xl p-6 border border-gold/15">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Wealth summary</p>
                  {overview?.wealthSummary?.hasData ? (
                    <>
                      <p className="font-display text-3xl text-gold tabular-nums">
                        {formatInr(overview.wealthSummary.netWorth)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Portfolio health: {overview.wealthSummary.healthScore}/100 ({overview.wealthSummary.healthLabel})
                        {overview.wealthSummary.updatedAt && (
                          <span> · Updated {formatWhen(overview.wealthSummary.updatedAt)}</span>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Add your first asset to see net worth and health score.
                    </p>
                  )}
                </div>
                <Link to="/dashboard/wealth-overview" className="btn-secondary btn-sm btn-pill shrink-0">
                  Wealth Overview <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Stagger>
        )}

        {!demoWorkspace && overview?.marketSnapshot && (
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            {(
              [
                { key: "sensex", label: "SENSEX" },
                { key: "nifty", label: "NIFTY" },
                { key: "gold", label: "GOLD" },
              ] as const
            ).map(({ key, label }) => {
              const snap = overview.marketSnapshot![key];
              const up = snap.changePercent != null && snap.changePercent > 0;
              const down = snap.changePercent != null && snap.changePercent < 0;
              return (
                <Link
                  key={key}
                  to="/dashboard/market-intel"
                  className="card-stat block hover:border-gold/20"
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="font-display text-xl mt-1 tabular-nums">{snap.value}</p>
                  {snap.changePercent != null && (
                    <p className={`text-xs mt-1 inline-flex items-center gap-0.5 ${up ? "text-success" : down ? "text-red-400" : "text-muted-foreground"}`}>
                      {up ? <TrendingUp className="h-3 w-3" /> : down ? <TrendingDown className="h-3 w-3" /> : null}
                      {up ? "▲" : down ? "▼" : ""} {Math.abs(snap.changePercent).toFixed(2)}%
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {!demoWorkspace && overview?.intelligenceSnippet && (
          <div className="glass rounded-xl p-4 mb-6 border border-[#c9a84c]/20 bg-[#c9a84c]/5">
            <p className="text-[10px] uppercase tracking-wider text-[#c9a84c] mb-1">Latest intelligence</p>
            <p className="text-sm leading-relaxed">{overview.intelligenceSnippet}</p>
            <Link to="/dashboard/wealth-overview" className="text-xs text-[#c9a84c] mt-2 inline-block hover:underline">
              View full brief →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Documents", value: Number(stats.documentCount) || 0, to: "/dashboard/documents", demoLocked: true },
            { label: "AI sessions", value: Number(stats.conversationCount) || 0, to: "/chat", demoLocked: false },
            { label: "Active goals", value: Number(stats.activeGoals) || 0, to: "/goals", demoLocked: true },
            { label: "Open tickets", value: Number(stats.openTickets) || 0, to: "/support", demoLocked: true },
          ].map((s) =>
            demoWorkspace && s.demoLocked ? (
              <DemoLockedTile key={s.label} label={s.label} value={s.value} />
            ) : demoWorkspace && !s.demoLocked ? (
              <button
                key={s.label}
                type="button"
                onClick={() => scrollToDemoSection("demo-ai-advisor")}
                className="card-stat demo-stat-active block text-left w-full"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.label}</p>
                <p className="font-display text-4xl mt-2 tabular-nums">{s.value}</p>
              </button>
            ) : (
              <Link key={s.label} to={s.to} className="card-stat block">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="font-display text-4xl mt-2 tabular-nums">{s.value}</p>
              </Link>
            ),
          )}
        </div>

        <Stagger className="mb-6" delay={0.05}>
          <div className="glass rounded-2xl p-6 lg:p-8 shadow-soft demo-panel">
            <p className="demo-section-eyebrow mb-6">Command modules</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {workspaceHub.map((item) =>
                demoWorkspace && item.demoAction === "locked" ? (
                  <DemoLockedTile
                    key={item.to}
                    label={item.label}
                    description={item.desc}
                    icon={item.icon}
                  />
                ) : demoWorkspace ? (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() =>
                      scrollToDemoSection(item.demoAction === "ai" ? "demo-ai-advisor" : "demo-insights")
                    }
                    className="demo-hub-tile panel-muted rounded-xl p-4 text-left"
                  >
                    <item.icon className="h-4 w-4 text-gold mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium leading-tight tracking-tight">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground/85 mt-1.5 leading-snug">{item.desc}</p>
                  </button>
                ) : (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => trackModuleClick(item.to)}
                    className="panel-muted rounded-xl p-4 hover:bg-muted/50 hover:border-gold/20 border border-transparent transition-all group"
                  >
                    <item.icon className="h-4 w-4 text-gold mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium leading-tight">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{item.desc}</p>
                  </Link>
                ),
              )}
            </div>
          </div>
        </Stagger>

        {demoWorkspace && (
          <Stagger className="mb-6" delay={0.08}>
            <div className="glass rounded-2xl p-6 lg:p-8 shadow-soft demo-panel">
              <p className="demo-section-eyebrow mb-6">Institutional modules · Preview</p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {demoLockedModules.map((mod) => (
                  <DemoLockedModuleCard
                    key={mod.id}
                    title={mod.title}
                    description={mod.description}
                    icon={mod.icon}
                  />
                ))}
              </div>
            </div>
          </Stagger>
        )}

        <div className="grid grid-cols-12 gap-4 lg:gap-5">
          <Stagger className="col-span-12" delay={0.1}>
            <div
              id="demo-ai-advisor"
              className={`scroll-mt-24 ${demoWorkspace ? "glass rounded-2xl shadow-soft demo-ai-section overflow-hidden" : "glass rounded-2xl p-7 shadow-soft lift"}`}
            >
              {demoWorkspace ? (
                <DemoAiPanel clientName={name} quotaDaily={quotaDaily} />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/30 to-gold/20 grid place-items-center">
                        <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={1.6} />
                      </div>
                      <h2 className="font-display text-xl tracking-tight">AI Advisor</h2>
                      {overview && overview.recentConversations.length > 0 && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                          {overview.recentConversations.length} recent
                        </span>
                      )}
                    </div>
                    <Link to="/chat" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 group">
                      Open advisor <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                  {overview && overview.recentConversations.length > 0 ? (
                    <div className="space-y-1">
                      {overview.recentConversations.map((c, i) => (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.08 }}
                        >
                          <Link
                            to="/chat"
                            className="group flex items-start gap-4 p-4 -mx-2 rounded-xl hover:bg-muted/30 transition-colors"
                          >
                            <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center shrink-0">
                              <MessageSquare className="h-4 w-4 text-primary" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-snug truncate">{c.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {c.messageCount} message{c.messageCount === 1 ? "" : "s"} · {formatWhen(c.updatedAt)}
                              </p>
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-gold transition-all mt-1" />
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-4">No AI sessions yet. Ask a financial or business question to get started.</p>
                      <Link to="/chat" className="btn-primary btn-sm btn-pill">
                        <Sparkles className="h-3.5 w-3.5" /> Start a conversation
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </Stagger>

          <Stagger className="col-span-12 lg:col-span-5" delay={0.15}>
            <div className={`glass rounded-2xl p-7 lg:p-8 shadow-soft h-full lift demo-panel ${demoWorkspace ? "demo-panel--locked relative overflow-hidden" : ""}`}>
              <div className="flex items-center gap-2 mb-6">
                <Target className="h-4 w-4 text-gold" strokeWidth={1.5} />
                <h2 className="font-display text-xl tracking-tight">Goals & planning</h2>
                {demoWorkspace && <Lock className="h-3.5 w-3.5 text-gold/50 ml-auto" strokeWidth={1.5} />}
              </div>
              {overview && overview.activeGoals.length > 0 ? (
                <div className="space-y-3">
                  {overview.activeGoals.map((g) =>
                    demoWorkspace ? (
                      <div key={g.id} className="panel-muted rounded-xl p-4 opacity-90">
                        <p className="text-sm font-medium">{g.title}</p>
                        {g.targetDate && (
                          <p className="text-[11px] text-muted-foreground mt-1">Target: {new Date(g.targetDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    ) : (
                      <Link key={g.id} to="/goals" className="block panel-muted rounded-xl p-4 hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium">{g.title}</p>
                        {g.targetDate && (
                          <p className="text-[11px] text-muted-foreground mt-1">Target: {new Date(g.targetDate).toLocaleDateString()}</p>
                        )}
                      </Link>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No active goals.{" "}
                  {demoWorkspace ? (
                    <span className="text-muted-foreground/70">{DEMO_LOCK_MESSAGE}</span>
                  ) : (
                    <Link to="/goals" className="text-gold hover:underline">
                      Create your first plan
                    </Link>
                  )}
                </p>
              )}
              {demoWorkspace && (
                <div className="demo-panel-lock-footer">
                  <Lock className="h-3 w-3 text-gold/70" strokeWidth={1.5} />
                  <span>{DEMO_LOCK_MESSAGE}</span>
                </div>
              )}
            </div>
          </Stagger>

          <Stagger className="col-span-12 lg:col-span-7" delay={0.2}>
            <div className={`glass rounded-2xl p-7 lg:p-8 shadow-soft lift demo-panel ${demoWorkspace ? "demo-panel--locked relative overflow-hidden" : ""}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <h2 className="font-display text-xl tracking-tight">Recent documents</h2>
                </div>
                {demoWorkspace ? (
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">{DEMO_LOCK_MESSAGE}</span>
                ) : (
                  <Link to="/dashboard/documents" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 group">
                    View all <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>
              {overview && overview.recentDocuments.length > 0 ? (
                <div className="space-y-3">
                  {overview.recentDocuments.map((d) =>
                    demoWorkspace ? (
                      <div key={d.id} className="flex items-center gap-4 p-3 -mx-2 rounded-xl opacity-90">
                        <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{d.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {d.category} · {formatWhen(d.uploadedAt)}
                          </p>
                        </div>
                        <span className="text-[10px] uppercase text-muted-foreground">{d.status}</span>
                      </div>
                    ) : (
                      <Link
                        key={d.id}
                        to="/dashboard/documents"
                        className="flex items-center gap-4 p-3 -mx-2 rounded-xl hover:bg-muted/30 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{d.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {d.category} · {formatWhen(d.uploadedAt)}
                          </p>
                        </div>
                        <span className="text-[10px] uppercase text-muted-foreground">{d.status}</span>
                      </Link>
                    ),
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Upload ITRs, GST notices, and deeds to your encrypted vault. Aurelius extracts key facts automatically.
                  </p>
                  {demoWorkspace ? (
                    <p className="mt-4 text-sm text-muted-foreground/70">{DEMO_LOCK_MESSAGE}</p>
                  ) : (
                    <Link to="/vault" className="mt-4 inline-flex text-sm text-gold hover:gap-2 items-center gap-1 transition-all">
                      Go to Secure Vault <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  )}
                </>
              )}
              {demoWorkspace && (
                <div className="demo-panel-lock-footer">
                  <Lock className="h-3 w-3 text-gold/70" strokeWidth={1.5} />
                  <span>{DEMO_LOCK_MESSAGE}</span>
                </div>
              )}
            </div>
          </Stagger>

          <Stagger className="col-span-12 lg:col-span-5" delay={0.25}>
            <div className="glass rounded-2xl p-7 shadow-soft h-full lift">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-4 w-4 text-primary" strokeWidth={1.5} />
                <h2 className="font-display text-xl tracking-tight">Recent activity</h2>
              </div>
              {activity.length > 0 ? (
                <div className="space-y-4 text-xs">
                  {activity.map((ev) =>
                    demoWorkspace ? (
                      <div key={ev.key} className="flex gap-3 pb-4 border-b border-border/30 last:border-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{ev.title}</p>
                          <p className="text-muted-foreground mt-0.5">{ev.detail}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-wider">{ev.when}</p>
                        </div>
                      </div>
                    ) : (
                      <Link key={ev.key} to={ev.to} className="flex gap-3 pb-4 border-b border-border/30 last:border-0 hover:opacity-80">
                        <span className="h-1.5 w-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{ev.title}</p>
                          <p className="text-muted-foreground mt-0.5">{ev.detail}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-wider">{ev.when}</p>
                        </div>
                      </Link>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Activity will appear here as you use the vault and AI Advisor.</p>
              )}
            </div>
          </Stagger>

          <Stagger className="col-span-12 lg:col-span-7" delay={0.3}>
            {demoWorkspace ? (
              <Link to="/waitlist" className="block group h-full demo-cta-card">
                <div className="glass-strong rounded-2xl p-7 lg:p-8 shadow-luxury h-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-gold/12 opacity-80" />
                  <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                    <div>
                      <p className="demo-section-eyebrow">Membership invitation</p>
                      <h3 className="font-display text-2xl sm:text-[1.65rem] tracking-tight mt-3">
                        Full private office access
                      </h3>
                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-md">
                        Unlock vault intelligence, advisor coordination, and institutional-grade wealth infrastructure.
                      </p>
                    </div>
                    <span className="demo-cta-card__action inline-flex items-center gap-2 text-sm text-gold shrink-0">
                      Request access <TrendingUp className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <Link to="/membership" className="block group h-full">
                <div className="glass-strong rounded-2xl p-7 shadow-luxury h-full relative overflow-hidden lift">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-gold/15 opacity-70" />
                  <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Membership status</p>
                      <h3 className="font-display text-2xl tracking-tight mt-2">{tierLabels[session.tier]}</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        {overview?.member?.subscription === "active"
                          ? `Active subscription${overview.member.subscriptionPlan ? ` · ${overview.member.subscriptionPlan}` : ""}`
                          : "View tier benefits and manage your membership."}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm text-gold group-hover:gap-3 transition-all shrink-0">
                      View membership <TrendingUp className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </Stagger>

          {demoWorkspace && (
            <Stagger className="col-span-12" delay={0.35}>
              <section id="demo-insights" className="scroll-mt-24">
                <div className="flex items-end justify-between gap-4 mb-6">
                  <div>
                    <p className="demo-section-eyebrow">Intelligence briefings</p>
                    <h2 className="font-display text-2xl tracking-tight mt-2">Sample portfolio intelligence</h2>
                  </div>
                  <span className="demo-preview-watermark hidden sm:inline">Sample data</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4 lg:gap-5">
                  <div className="glass rounded-2xl p-6 lg:p-7 shadow-soft demo-insight-card">
                    <p className="demo-section-eyebrow mb-4">Portfolio overview</p>
                    <p className="font-display text-3xl gold-text tracking-tight">{demoPortfolioOverview.netWorth}</p>
                    <p className="text-sm text-muted-foreground/90 mt-1.5">Consolidated household wealth</p>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div className="panel-muted rounded-xl px-3.5 py-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em]">Liquid AUM</p>
                        <p className="font-medium mt-1 tabular-nums">{demoPortfolioOverview.liquidAum}</p>
                      </div>
                      <div className="panel-muted rounded-xl px-3.5 py-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em]">Entities</p>
                        <p className="font-medium mt-1 tabular-nums">{demoPortfolioOverview.entities}</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {demoPortfolioOverview.allocation.map((a) => (
                        <div key={a.name}>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">{a.name}</span>
                            <span className="font-mono text-gold tabular-nums">{a.value}%</span>
                          </div>
                          <div className="demo-allocation-bar">
                            <div className="demo-allocation-bar__fill" style={{ width: `${a.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass rounded-2xl p-6 lg:p-7 shadow-soft demo-insight-card">
                    <p className="demo-section-eyebrow mb-4 flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-gold" />
                      Tax intelligence
                    </p>
                    <ul className="space-y-3">
                      {demoTaxInsights.map((item) => (
                        <li key={item.title} className="demo-insight-item panel-muted rounded-xl px-4 py-3.5">
                          <p className="text-sm leading-snug tracking-tight">{item.title}</p>
                          <p className="text-xs text-gold mt-1.5">{item.impact}</p>
                          <p className="text-[10px] text-muted-foreground/80 mt-1.5 uppercase tracking-[0.12em]">{item.tag}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="glass rounded-2xl p-6 lg:p-7 shadow-soft demo-insight-card">
                    <p className="demo-section-eyebrow mb-4">Advisor coordination</p>
                    <ul className="space-y-4">
                      {demoAdvisorNotes.map((advisor) => (
                        <li key={advisor.name} className="demo-advisor-note border-b border-border/25 pb-4 last:border-0 last:pb-0">
                          <p className="text-sm font-medium tracking-tight">{advisor.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] mt-1">{advisor.role}</p>
                          <p className="text-xs text-muted-foreground/90 mt-2.5 leading-relaxed">{advisor.note}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </Stagger>
          )}
        </div>
      </div>
    </div>
  );
}

function Stagger({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
