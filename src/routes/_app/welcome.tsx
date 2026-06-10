import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { getAuthSession } from "@/lib/auth/session.functions";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles, Target, User } from "lucide-react";
import { Route as AppRoute } from "@/routes/_app";
import { completeMemberOnboarding } from "@/lib/member/client";

export const Route = createFileRoute("/_app/welcome")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (!session) throw redirect({ to: "/access" });
    if (session.onboardingComplete !== false) throw redirect({ to: "/dashboard" });
    if (session.role === "EXPERT") throw redirect({ to: "/expert" });
    if (session.role === "SUPER_ADMIN") throw redirect({ to: "/founder" });
  },
  head: () => ({ meta: [{ title: "Welcome — Aurelius" }] }),
  component: WelcomePage,
});

const steps = ["Welcome", "Your profile", "Financial goals"] as const;

function WelcomePage() {
  const { session } = AppRoute.useRouteContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(session.fullName);
  const [profession, setProfession] = useState("");
  const [firm, setFirm] = useState("");
  const [goals, setGoals] = useState([
    { title: "", description: "", targetDate: "" },
    { title: "", description: "", targetDate: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    setLoading(true);
    setError("");
    try {
      await completeMemberOnboarding({
        fullName,
        profession,
        firm,
        goals: goals.filter((g) => g.title.trim()),
      });
      navigate({ to: "/getting-started" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-5 lg:p-10">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`h-8 w-8 rounded-full grid place-items-center text-xs font-medium shrink-0 ${
                  i <= step ? "bg-foreground text-background" : "hairline text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-[10px] uppercase tracking-wider hidden sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                {s}
              </span>
              {i < steps.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-gold/50" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-8 shadow-luxury">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <div className="h-12 w-12 rounded-xl bg-gold/15 grid place-items-center mb-6">
                  <Sparkles className="h-5 w-5 text-gold" />
                </div>
                <h1 className="font-display text-3xl tracking-tight">Welcome to Aurelius.</h1>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  Your private wealth intelligence workspace is ready. In the next minute we will personalise your profile and set your first financial goals.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" /> Encrypted document vault</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" /> AI financial advisor</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" /> Expert advisory network</li>
                </ul>
                <button
                  onClick={() => setStep(1)}
                  className="mt-8 h-11 px-6 rounded-xl bg-foreground text-background text-sm font-medium inline-flex items-center gap-2"
                >
                  Begin setup <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="profile" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <div className="flex items-center gap-2 mb-6">
                  <User className="h-4 w-4 text-gold" />
                  <h2 className="font-display text-2xl">Your profile</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Full name</label>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="field-input mt-1" required />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Profession</label>
                    <input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="e.g. Founder, CXO, Family principal" className="field-input mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Firm / family office (optional)</label>
                    <input value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="e.g. Mehta Holdings" className="field-input mt-1" />
                  </div>
                </div>
                <div className="flex gap-2 mt-8">
                  <button onClick={() => setStep(0)} className="h-11 px-5 rounded-xl hairline text-sm">Back</button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!fullName.trim()}
                    className="h-11 px-6 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="goals" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <div className="flex items-center gap-2 mb-6">
                  <Target className="h-4 w-4 text-gold" />
                  <h2 className="font-display text-2xl">Financial goals</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Set one or two priorities. You can add more from Goals & Planning later.</p>
                <div className="space-y-4">
                  {goals.map((g, i) => (
                    <div key={i} className="panel-muted rounded-xl p-4 space-y-2">
                      <input
                        value={g.title}
                        onChange={(e) => {
                          const next = [...goals];
                          next[i] = { ...next[i]!, title: e.target.value };
                          setGoals(next);
                        }}
                        placeholder={i === 0 ? "e.g. Optimise capital gains for FY26" : "Optional second goal"}
                        className="field-input text-sm"
                      />
                      <input
                        type="date"
                        value={g.targetDate}
                        onChange={(e) => {
                          const next = [...goals];
                          next[i] = { ...next[i]!, targetDate: e.target.value };
                          setGoals(next);
                        }}
                        className="field-input text-sm"
                      />
                    </div>
                  ))}
                </div>
                {error && <p className="text-xs text-destructive mt-4">{error}</p>}
                <div className="flex gap-2 mt-8">
                  <button onClick={() => setStep(1)} className="h-11 px-5 rounded-xl hairline text-sm">Back</button>
                  <button
                    onClick={finish}
                    disabled={loading}
                    className="h-11 px-6 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-40 inline-flex items-center gap-2"
                  >
                    {loading ? "Setting up…" : "Enter your workspace"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
