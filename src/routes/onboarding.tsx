import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ShieldCheck, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { completeOnboarding } from "@/lib/auth/client";
import { getAuthSession, getPendingInvite } from "@/lib/auth/session.functions";

type OnboardingSearch = { code?: string };

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>): OnboardingSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  loader: async ({ search }) => {
    const session = await getAuthSession();
    if (session) throw redirect({ to: "/dashboard" });

    const codeFromSearch = search.code?.trim();
    if (codeFromSearch) return { inviteCode: codeFromSearch };

    const pending = await getPendingInvite();
    if (!pending) throw redirect({ to: "/access" });
    return { inviteCode: pending };
  },
  head: () => ({ meta: [{ title: "Private Onboarding — Aureliuss" }] }),
  component: OnboardingPage,
});

const steps = ["Identity", "Confirmation", "Vault access"] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const { inviteCode: loaderCode } = Route.useLoaderData();
  const { code: searchCode } = Route.useSearch();
  const inviteCode = useMemo(
    () =>
      loaderCode ??
      searchCode ??
      (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("aureliuss_invite") : null) ??
      "",
    [loaderCode, searchCode],
  );

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(() =>
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem("aureliuss_invite_email") ?? "" : "",
  );
  const [password, setPassword] = useState("");
  const [firm, setFirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!inviteCode) {
    return (
      <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
        <div className="flex-1 grid place-items-center px-6">
          <div className="text-center max-w-md">
            <div className="flex justify-center mb-8">
              <Logo />
            </div>
            <p className="text-muted-foreground text-sm mb-6">Your invitation session has expired. Verify your code again to continue.</p>
            <Link to="/access" className="text-sm text-foreground underline underline-offset-4">
              Return to private access
            </Link>
          </div>
        </div>
        <PremiumFooter variant="minimal" className="shrink-0" />
      </ImmersiveScene>
    );
  }

  async function finish() {
    setLoading(true);
    setError(null);
    try {
      await completeOnboarding({ code: inviteCode, email, fullName, firm: firm || undefined, password: password || undefined });
      sessionStorage.removeItem("aureliuss_invite");
      sessionStorage.removeItem("aureliuss_invite_email");
      navigate({ to: "/dashboard" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onboarding failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
      <header className="px-6 lg:px-10 pt-8">
        <Logo />
      </header>

      <div className="flex-1 flex items-center justify-center px-6 lg:px-10 py-12">
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-3 mb-10">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center gap-3 flex-1 last:flex-none">
                <div
                  className={`h-8 w-8 rounded-full grid place-items-center text-xs font-medium transition-colors duration-500 ${
                    i <= step ? "bg-foreground text-background" : "hairline text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block tracking-wide ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {i < steps.length - 1 && <div className="h-px flex-1 bg-border/40 hidden sm:block" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <>
                  <p className="label-caps mb-3">Step I</p>
                  <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-2">Establish your identity</h1>
                  <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                    Details are encrypted and visible only to your assigned private office.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground tracking-wide">Full legal name</label>
                      <div className="relative mt-1.5">
                        <User className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.4} />
                        <input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full panel-elevated rounded-xl h-12 pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold/30"
                          placeholder="As on PAN / passport"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground tracking-wide">Principal email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full panel-elevated rounded-xl h-12 px-4 text-sm mt-1.5 focus:outline-none focus:ring-1 focus:ring-gold/30"
                        placeholder="you@privateoffice.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground tracking-wide">Secure password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        className="w-full panel-elevated rounded-xl h-12 px-4 text-sm mt-1.5 focus:outline-none focus:ring-1 focus:ring-gold/30"
                        placeholder="Minimum 8 characters"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground tracking-wide">Firm / family office (optional)</label>
                      <input
                        value={firm}
                        onChange={(e) => setFirm(e.target.value)}
                        className="w-full panel-elevated rounded-xl h-12 px-4 text-sm mt-1.5 focus:outline-none focus:ring-1 focus:ring-gold/30"
                        placeholder="Malhotra Family Office"
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <p className="label-caps mb-3">Step II</p>
                  <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-2">Confirm membership</h1>
                  <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                    Review your invitation allocation before we provision your vault.
                  </p>
                  <div className="panel-elevated rounded-2xl p-6 space-y-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Invitation</span>
                      <span className="font-mono tracking-wider text-xs">{inviteCode}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Principal</span>
                      <span>{fullName}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Email</span>
                      <span className="truncate">{email}</span>
                    </div>
                  </div>
                  <label className="mt-6 flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
                      I confirm this invitation is personal, non-transferable, and subject to Aureliuss private membership terms and DPDP compliance.
                    </span>
                  </label>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="label-caps mb-3">Step III</p>
                  <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-2">Your vault awaits</h1>
                  <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                    We will provision your intelligence workspace, custodied vault, and advisory channel.
                  </p>
                  <div className="panel rounded-2xl p-6 flex items-start gap-4">
                    <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" strokeWidth={1.4} />
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      End-to-end encryption · India data residency · SOC 2 Type II controls. Your session remains active for 30 days on this device.
                    </div>
                  </div>
                  {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="h-12 px-5 rounded-xl hairline text-sm hover:bg-card/40 transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              disabled={
                loading ||
                (step === 0 && (!fullName.trim() || !email.trim() || (password && password.length < 8))) ||
                (step === 1 && !agreed)
              }
              onClick={() => {
                if (step < 2) setStep((s) => s + 1);
                else finish();
              }}
              className="flex-1 h-12 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/92 disabled:opacity-40 transition-all inline-flex items-center justify-center gap-2"
            >
              {step < 2 ? "Continue" : loading ? "Provisioning…" : "Enter Aureliuss"}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <PremiumFooter variant="minimal" className="mt-auto shrink-0" />
    </ImmersiveScene>
  );
}
