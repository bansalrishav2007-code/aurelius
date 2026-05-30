import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { mockAllocation, mockDeadlines, mockRecommendations } from "@/lib/mock-data";
import { TrendingUp, TrendingDown, FileText, AlertCircle, Sparkles, ArrowUpRight, ShieldCheck, MessageSquare, ArrowRight, Activity, Scale } from "lucide-react";
import { AllocationDonut, LiabilityChart, RiskGauge } from "@/components/charts";
import { TrustStrip } from "@/components/TrustStrip";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Aureliuss" }] }),
  component: Dashboard,
});

function firstName(fullName: string) {
  return fullName.split(/\s+/)[0] ?? "Principal";
}

const tierLabels = { founding: "Founding circle", principal: "Principal · Tier I", "family-office": "Family office charter" };

function Dashboard() {
  const { session } = AppRoute.useRouteContext();
  const name = firstName(session.fullName);
  return (
    <div className="relative">
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
      <div className="relative p-5 lg:p-10 max-w-[1440px] mx-auto">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Private Workspace · {tierLabels[session.tier]}</p>
            </div>
            <h1 className="font-display text-5xl tracking-tight">Good evening, {name}.</h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl">Your tax posture is healthy. Three matters need attention this quarter — your AI has prepared briefs.</p>
          </div>
          <div className="flex gap-2">
            <button className="text-sm hairline bg-card/60 hover:bg-card rounded-full px-4 py-2 transition-colors">Export brief</button>
            <Link to="/chat" className="text-sm bg-foreground text-background hover:bg-foreground/90 rounded-full px-4 py-2 inline-flex items-center gap-2 transition-colors">
              <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.8} /> Ask Aureliuss
            </Link>
          </div>
        </motion.header>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="mb-7">
          <TrustStrip />
        </motion.div>

        <div className="grid grid-cols-12 gap-4">
          {/* Risk gauge */}
          <Stagger className="col-span-12 lg:col-span-5" delay={0.05}>
            <div className="glass rounded-2xl p-7 h-full shadow-soft relative overflow-hidden lift">
              <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-success/10 blur-3xl" />
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Tax Risk Score</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1.5">AY 2025-26 · refreshed 3h ago</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-success/12 text-success border border-success/20">Low Risk</span>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <RiskGauge score={87} />
              </div>
              <div className="text-center text-xs text-success inline-flex items-center gap-1 mx-auto w-full justify-center -mt-2">
                <TrendingUp className="h-3 w-3" /> +4 vs last quarter
              </div>
              <div className="mt-7 space-y-3.5">
                {[
                  { l: "Direct Tax Compliance", v: 94 },
                  { l: "GST Posture", v: 82 },
                  { l: "FEMA & Disclosures", v: 88 },
                  { l: "Documentation Hygiene", v: 79 },
                ].map((s, i) => (
                  <div key={s.l}>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-muted-foreground">{s.l}</span>
                      <span className="font-medium tabular-nums">{s.v}</span>
                    </div>
                    <div className="h-[3px] bg-muted/60 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${s.v}%` }} transition={{ duration: 1.4, delay: 0.4 + i * 0.1, ease: [0.2, 0.7, 0.2, 1] }} className="h-full bg-gradient-to-r from-primary via-primary to-gold rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Stagger>

          {/* Liability projection chart */}
          <Stagger className="col-span-12 lg:col-span-7" delay={0.1}>
            <div className="glass rounded-2xl p-7 h-full shadow-soft lift">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Projected Liability — AY 25-26</p>
                  <div className="flex items-end gap-3 mt-3">
                    <span className="font-display text-5xl tracking-tight">₹4.82</span>
                    <span className="text-muted-foreground pb-2 text-sm">Cr</span>
                    <span className="ml-3 mb-2 inline-flex items-center gap-1 text-xs text-success">
                      <TrendingDown className="h-3 w-3" /> ₹62.4L lower with Aureliuss
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary/70" /> Pre-optimisation</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" /> After Aureliuss</span>
                </div>
              </div>
              <div className="mt-4 -ml-1">
                <LiabilityChart />
              </div>
            </div>
          </Stagger>

          {/* Wealth allocation */}
          <Stagger className="col-span-12 lg:col-span-4" delay={0.15}>
            <div className="glass rounded-2xl p-7 h-full shadow-soft lift">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Wealth Allocation</p>
                  <p className="font-display text-3xl tracking-tight mt-2">₹84.2 Cr</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full hairline text-muted-foreground">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <AllocationDonut />
                <div className="space-y-2">
                  {mockAllocation.map((a) => (
                    <div key={a.name} className="flex items-center gap-2 text-[11px]">
                      <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                      <span className="flex-1 truncate text-muted-foreground">{a.name}</span>
                      <span className="tabular-nums font-medium">{a.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Stagger>

          {/* AI Recommendations */}
          <Stagger className="col-span-12 lg:col-span-8" delay={0.2}>
            <div className="glass rounded-2xl p-7 shadow-soft h-full lift">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/30 to-gold/20 grid place-items-center">
                    <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={1.6} />
                  </div>
                  <h2 className="font-display text-xl tracking-tight">AI Recommendations</h2>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">3 new</span>
                </div>
                <Link to="/chat" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 group">
                  Explore all <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              <div className="gold-divider mb-2" />
              <div className="space-y-1">
                {mockRecommendations.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="group flex items-start gap-4 p-4 -mx-2 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center shrink-0 group-hover:bg-primary/25 transition-colors">
                      <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.tag}</span>
                      </div>
                      <p className="text-sm font-medium leading-snug">{r.title}</p>
                      <p className="text-xs text-gold mt-1.5 tabular-nums">{r.impact}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-gold transition-all mt-1" />
                  </motion.div>
                ))}
              </div>
            </div>
          </Stagger>

          {/* Compliance Deadlines */}
          <Stagger className="col-span-12 lg:col-span-5" delay={0.25}>
            <div className="glass rounded-2xl p-7 shadow-soft h-full lift">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="h-4 w-4 text-warning" strokeWidth={1.5} />
                <h2 className="font-display text-xl tracking-tight">Upcoming Deadlines</h2>
              </div>
              <div className="space-y-4">
                {mockDeadlines.map((d) => (
                  <div key={d.id} className="flex items-center gap-4 pb-4 border-b border-border/30 last:border-0 last:pb-0">
                    <div className="font-display text-4xl text-foreground/80 w-14 tabular-nums leading-none">{d.days}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground -ml-2">days</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{d.date}</p>
                    </div>
                    <span className={`relative h-2 w-2 rounded-full ${d.severity === "high" ? "bg-destructive text-destructive pulse-dot" : d.severity === "medium" ? "bg-warning" : "bg-success"}`} />
                  </div>
                ))}
              </div>
            </div>
          </Stagger>

          {/* Recent Documents */}
          <Stagger className="col-span-12 lg:col-span-7" delay={0.3}>
            <div className="glass rounded-2xl p-7 shadow-soft lift">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <h2 className="font-display text-xl tracking-tight">Recent Documents</h2>
                </div>
                <Link to="/vault" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 group">
                  Open vault <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">Upload ITRs, GST notices, and deeds to your encrypted vault. Aureliuss intelligence extracts key facts automatically.</p>
              <Link to="/vault" className="mt-4 inline-flex text-sm text-gold hover:gap-2 items-center gap-1 transition-all">
                Go to Secure Vault <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </Stagger>

          {/* Compliance Center */}
          <Stagger className="col-span-12 lg:col-span-7" delay={0.32}>
            <div className="glass rounded-2xl p-7 shadow-soft h-full lift">
              <div className="flex items-center gap-2 mb-6">
                <Scale className="h-4 w-4 text-gold" strokeWidth={1.5} />
                <h2 className="font-display text-xl tracking-tight">Compliance Center</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Direct tax posture", status: "Healthy", tone: "text-success" },
                  { label: "GST filings", status: "1 notice pending", tone: "text-warning" },
                  { label: "FEMA disclosures", status: "Review Q4", tone: "text-muted-foreground" },
                  { label: "Advance tax Q3", status: "Due in 12 days", tone: "text-destructive" },
                ].map((item) => (
                  <div key={item.label} className="panel-muted rounded-xl p-4">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`mt-1 font-medium ${item.tone}`}>{item.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </Stagger>

          {/* Activity Timeline */}
          <Stagger className="col-span-12 lg:col-span-5" delay={0.34}>
            <div className="glass rounded-2xl p-7 shadow-soft h-full lift">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-4 w-4 text-primary" strokeWidth={1.5} />
                <h2 className="font-display text-xl tracking-tight">Activity Timeline</h2>
              </div>
              <div className="space-y-4 text-xs">
                {[
                  { t: "AI copilot session", d: "Tax harvesting strategy reviewed", when: "Today" },
                  { t: "Vault upload", d: "Document secured", when: "Yesterday" },
                  { t: "Compliance scan", d: "Risk score refreshed +4", when: "3 days ago" },
                ].map((ev) => (
                  <div key={ev.t} className="flex gap-3 pb-4 border-b border-border/30 last:border-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{ev.t}</p>
                      <p className="text-muted-foreground mt-0.5">{ev.d}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-wider">{ev.when}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Stagger>

          {/* AI Copilot CTA */}
          <Stagger className="col-span-12 lg:col-span-5" delay={0.35}>
            <Link to="/chat" className="block group h-full">
              <div className="glass-strong rounded-2xl p-7 shadow-luxury h-full relative overflow-hidden lift">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-gold/15 opacity-70" />
                <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-gold/10 blur-3xl group-hover:bg-gold/20 transition-colors" />
                <div className="relative h-full flex flex-col">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-gold/60 grid place-items-center mb-5 shadow-luxury">
                    <Sparkles className="h-4 w-4 text-background" strokeWidth={1.6} />
                  </div>
                  <h3 className="font-display text-2xl tracking-tight mb-2">Ask Aureliuss anything.</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Your private wealth copilot — tax, compliance, vault intelligence, and counsel-grade briefs.
                  </p>
                  <span className="mt-auto inline-flex items-center gap-2 text-sm group-hover:gap-3 transition-all text-gold">
                    Open assistant <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          </Stagger>
        </div>
      </div>
    </div>
  );
}

function Stagger({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] }} className={className}>
      {children}
    </motion.div>
  );
}
