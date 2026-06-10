import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  FolderLock,
  Send,
  Target,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatedInr } from "./AnimatedInr";
import { IntroductionRequestModal } from "@/components/experts/directory/IntroductionRequestModal";
import { createMemberGoal } from "@/lib/member/client";
import { fetchDashboardExperts, type DashboardExpert } from "@/lib/experts/client";
import { formatInr } from "@/lib/wealth/calculations";
import {
  buildTaxActionPlan,
  planShareMessage,
  type TaxActionItem,
} from "@/lib/wealth/tax-action-plan";
import type { TaxCalculatorInput, TaxCalculatorResult } from "@/lib/wealth/tax-calculator";
import { FY_LABEL } from "@/lib/wealth/tax-calculator";

const DONE_KEY = "aurelius_tax_plan_done";

const PRIORITY_META = {
  high: { label: "High", dot: "🔴", className: "text-red-400 border-red-400/30 bg-red-400/10" },
  medium: { label: "Medium", dot: "🟡", className: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  low: { label: "Low", dot: "🟢", className: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
} as const;

function ConfettiBurst() {
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {pieces.map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 1, y: "40vh", x: `${(i % 12) * 8 + 10}vw`, rotate: 0 }}
          animate={{ opacity: 0, y: "10vh", rotate: 360 }}
          transition={{ duration: 2.2, delay: i * 0.04, ease: "easeOut" }}
          className="absolute h-2 w-2 rounded-sm"
          style={{ backgroundColor: i % 2 ? "#c9a84c" : "#4ade80" }}
        />
      ))}
    </div>
  );
}

type Props = {
  input: TaxCalculatorInput;
  result: TaxCalculatorResult;
  isDemo: boolean;
  onSavePlanVault: () => Promise<void>;
  saving: boolean;
};

export function TaxActionPlanSection({ input, result, isDemo, onSavePlanVault, saving }: Props) {
  const navigate = useNavigate();
  const plan = useMemo(() => buildTaxActionPlan(input, result), [input, result]);
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());
  const [caExpert, setCaExpert] = useState<DashboardExpert | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareAction, setShareAction] = useState<TaxActionItem | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DONE_KEY);
      if (raw) setDoneIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const persistDone = useCallback((ids: Set<string>) => {
    setDoneIds(ids);
    localStorage.setItem(DONE_KEY, JSON.stringify([...ids]));
  }, []);

  const toggleDone = (id: string) => {
    const next = new Set(doneIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persistDone(next);
    if (next.size === plan.actions.length) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    }
  };

  const lockedSavings = useMemo(
    () => plan.actions.filter((a) => doneIds.has(a.id)).reduce((s, a) => s + a.taxSaved, 0),
    [plan.actions, doneIds],
  );
  const remainingSavings = Math.max(0, plan.maxSave - lockedSavings);
  const progressPct = plan.actions.length ? Math.round((doneIds.size / plan.actions.length) * 100) : 0;

  const hasIncome = result.totalGrossIncome > 0;
  if (!hasIncome) return null;

  async function openCa(action?: TaxActionItem) {
    try {
      const { experts } = await fetchDashboardExperts({ specialty: "tax" });
      const expert = experts[0];
      if (!expert) {
        toast.error("No CA expert available.");
        return;
      }
      setCaExpert(expert);
      setShareAction(action ?? null);
      setShareOpen(true);
    } catch {
      toast.error("Unable to load experts.");
    }
  }

  async function addGoal(action: TaxActionItem) {
    if (isDemo) {
      toast.error("Demo mode — goals are read-only.");
      return;
    }
    try {
      await createMemberGoal({
        title: action.goalTitle,
        description: action.recommendation,
        category: "Wealth Preservation",
        priority: action.priority,
        targetAmount: action.taxSaved,
      });
      toast.success("Added to Goals & Planning.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add goal.");
    }
  }

  async function saveActionVault(action: TaxActionItem) {
    if (isDemo) {
      toast.error("Demo mode — vault save is locked.");
      return;
    }
    try {
      const res = await fetch("/api/member/tax-calculator", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_action",
          input,
          actionItem: action,
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message ?? "Saved to vault.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    }
  }

  function askAi(action: TaxActionItem) {
    navigate({ to: "/dashboard/ai-advisor", search: { preload: action.askAiPrompt } });
  }

  const shareMessage = shareAction
    ? `I'd like CA guidance on: ${shareAction.title}. ${shareAction.recommendation} Potential saving: ${formatInr(shareAction.taxSaved)}.`
    : planShareMessage(plan, FY_LABEL);

  return (
    <>
      {showConfetti && <ConfettiBurst />}

      <section className="glass rounded-2xl border border-[#c9a84c]/35 p-6 lg:p-8 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#c9a84c]/80 mb-2">Tax intelligence</p>
            <h2 className="font-display text-2xl lg:text-3xl text-[#c9a84c]">Your Tax Saving Action Plan</h2>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => openCa()}
            className="h-10 px-4 text-xs rounded-xl bg-[#c9a84c] text-[#0a0e1a] font-medium inline-flex items-center gap-2 hover:bg-[#e8d5a3] disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            Send this plan to your CA
          </button>
        </div>

        <div className="rounded-xl border border-border/30 bg-[#0a0e1a]/60 p-5 lg:p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are currently paying{" "}
            <span className="text-foreground font-medium">
              <AnimatedInr value={plan.currentTax} />
            </span>{" "}
            in taxes. Aurelius has identified{" "}
            <span className="text-[#c9a84c] font-medium">
              <AnimatedInr value={plan.identifiedSavings} />
            </span>{" "}
            in legal tax savings. Here&apos;s your action plan.
          </p>
          <p className="font-display text-4xl lg:text-5xl text-[#c9a84c] mt-6">
            You can save up to <AnimatedInr value={plan.maxSave} />
          </p>
        </div>

        <div className="space-y-4">
          {plan.actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              done={doneIds.has(action.id)}
              onToggle={() => toggleDone(action.id)}
              onAskAi={() => askAi(action)}
              onConnectCa={() => openCa(action)}
              onAddGoal={() => addGoal(action)}
              onSaveVault={() => saveActionVault(action)}
              isDemo={isDemo}
            />
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <TimelineColumn
            title="Do immediately (before 31 March)"
            subtitle={`${plan.daysToFyEnd} days remaining`}
            items={plan.timeline.immediate}
            doneIds={doneIds}
          />
          <TimelineColumn title="Do this financial year" items={plan.timeline.thisFy} doneIds={doneIds} />
          <TimelineColumn title="Plan for next year" items={plan.timeline.nextYear} doneIds={doneIds} />
        </div>

        <div className="rounded-2xl border border-[#c9a84c]/40 bg-[#c9a84c]/5 p-6 text-center space-y-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total savings scorecard</p>
          <div className="h-2 rounded-full bg-border/40 overflow-hidden max-w-md mx-auto">
            <motion.div
              className="h-full bg-[#c9a84c]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {doneIds.size} of {plan.actions.length} recommendations implemented
          </p>
          <p className="text-sm">
            Estimated savings locked in:{" "}
            <span className="text-emerald-400 font-medium">{formatInr(lockedSavings)}</span>
            {remainingSavings > 0 && (
              <>
                {" "}
                · Remaining opportunity:{" "}
                <span className="text-[#c9a84c]">{formatInr(remainingSavings)}</span>
              </>
            )}
          </p>
          <p className="font-display text-2xl lg:text-3xl text-[#c9a84c]">
            Implement all recommendations → Save {formatInr(plan.maxSave)} this year
          </p>
          <button
            type="button"
            disabled={saving || isDemo}
            onClick={onSavePlanVault}
            className="h-10 px-5 text-xs rounded-xl border border-[#c9a84c]/40 text-[#c9a84c] inline-flex items-center gap-2 hover:bg-[#c9a84c]/10 disabled:opacity-40"
          >
            <FolderLock className="h-3.5 w-3.5" />
            Save full plan to vault
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground/80 text-center italic leading-relaxed">
          All recommendations are based on current IT Act provisions. Aurelius does not file taxes. Consult your CA before
          implementation.
        </p>
      </section>

      {shareOpen && caExpert && (
        <IntroductionRequestModal
          expert={caExpert}
          onClose={() => {
            setShareOpen(false);
            setShareAction(null);
          }}
          defaultMessage={shareMessage}
        />
      )}
    </>
  );
}

function ActionCard({
  action,
  done,
  onToggle,
  onAskAi,
  onConnectCa,
  onAddGoal,
  onSaveVault,
  isDemo,
}: {
  action: TaxActionItem;
  done: boolean;
  onToggle: () => void;
  onAskAi: () => void;
  onConnectCa: () => void;
  onAddGoal: () => void;
  onSaveVault: () => void;
  isDemo: boolean;
}) {
  const p = PRIORITY_META[action.priority];

  return (
    <motion.div
      layout
      className={`rounded-xl border p-5 transition-colors ${
        done ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/35 bg-card/20"
      }`}
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={onToggle}
          className={`mt-0.5 h-6 w-6 rounded-md border shrink-0 grid place-items-center transition-all ${
            done ? "border-emerald-400 bg-emerald-400/20" : "border-border/50 hover:border-[#c9a84c]/50"
          }`}
          aria-label={done ? "Mark not done" : "Mark done"}
        >
          <AnimatePresence>
            {done && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${p.className}`}>
              {p.dot} {p.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{action.category}</span>
            {done && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          </div>

          <h3 className={`font-display text-lg ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {action.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground/70">Current: </span>
            {action.currentStatus}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{action.recommendation}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-[#c9a84c]/90">{action.section}</span>
            {action.taxSaved > 0 && (
              <span className="text-emerald-400 font-medium">Save {formatInr(action.taxSaved)}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onAskAi}
              className="h-8 px-3 rounded-lg text-[11px] border border-border/50 inline-flex items-center gap-1.5 hover:border-[#c9a84c]/40"
            >
              <Bot className="h-3 w-3" /> Ask Aurelius AI
            </button>
            <button
              type="button"
              onClick={onConnectCa}
              className="h-8 px-3 rounded-lg text-[11px] border border-border/50 inline-flex items-center gap-1.5 hover:border-[#c9a84c]/40"
            >
              <UserCheck className="h-3 w-3" /> Connect with CA
            </button>
            <button
              type="button"
              onClick={onAddGoal}
              disabled={isDemo}
              className="h-8 px-3 rounded-lg text-[11px] border border-border/50 inline-flex items-center gap-1.5 hover:border-[#c9a84c]/40 disabled:opacity-40"
            >
              <Target className="h-3 w-3" /> Add to Goals
            </button>
            <button
              type="button"
              onClick={onSaveVault}
              disabled={isDemo}
              className="h-8 px-3 rounded-lg text-[11px] border border-border/50 inline-flex items-center gap-1.5 hover:border-[#c9a84c]/40 disabled:opacity-40"
            >
              <FolderLock className="h-3 w-3" /> Save to Vault
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TimelineColumn({
  title,
  subtitle,
  items,
  doneIds,
}: {
  title: string;
  subtitle?: string;
  items: TaxActionItem[];
  doneIds: Set<string>;
}) {
  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-border/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-[#c9a84c]" />
        <h4 className="text-sm font-medium">{title}</h4>
      </div>
      {subtitle && <p className="text-[11px] text-amber-400/90 mb-3">{subtitle}</p>}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className={doneIds.has(item.id) ? "text-emerald-400" : "text-[#c9a84c]"}>•</span>
            <span className={doneIds.has(item.id) ? "line-through opacity-60" : ""}>{item.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
