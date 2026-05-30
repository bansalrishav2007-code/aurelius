import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Crown, KeyRound, Lock, Mail, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { InviteCodeInput, formatInviteDisplay } from "@/components/auth/InviteCodeInput";
import { verifyInviteCode, reserveInviteCode } from "@/lib/auth/client";
import type { PublicInvitePreview } from "@/lib/auth/types";
import { getAuthSession } from "@/lib/auth/session.functions";

type AccessSearch = {
  code?: string;
  email?: string;
};

export const Route = createFileRoute("/access")({
  validateSearch: (search: Record<string, unknown>): AccessSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Private Access — Aureliuss" }] }),
  component: AccessPage,
});

const tierCopy: Record<NonNullable<PublicInvitePreview["tier"]>, string> = {
  founding: "Founding circle",
  principal: "Principal membership",
  "family-office": "Family office charter",
};

function AccessPage() {
  const navigate = useNavigate();
  const { code: codeParam, email: emailParam } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("AURA");
  const [preview, setPreview] = useState<PublicInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
    if (codeParam) setCode(codeParam.replace(/[^A-Z0-9]/gi, "").toUpperCase());
  }, [codeParam, emailParam]);

  const displayCode = formatInviteDisplay(code);
  const clean = code.replace(/[^A-Z0-9]/g, "");
  const isDevCode = clean === "AURA";
  const emailReady = isDevCode || email.trim().includes("@");
  const codeReady = isDevCode || clean.length >= 13;
  const ready = emailReady && codeReady;

  async function handleVerify() {
    if (!ready) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const result = await verifyInviteCode(displayCode, email.trim());
      if (!result.valid) {
        setError(result.error ?? "Invalid invitation.");
        return;
      }
      setPreview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify invitation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnter() {
    if (!preview?.valid) return;
    setLoading(true);
    setError(null);
    try {
      await reserveInviteCode(displayCode, email.trim());
      sessionStorage.setItem("aureliuss_invite", displayCode);
      sessionStorage.setItem("aureliuss_invite_email", email.trim().toLowerCase());
      navigate({ to: "/onboarding", search: { code: displayCode } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reserve invitation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
      <header className="relative z-10 px-6 lg:px-10 pt-8 flex items-center justify-between">
        <Logo />
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Returning member
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 lg:px-10 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hairline panel-muted text-[11px] text-muted-foreground mb-8 tracking-wide">
            <Lock className="h-3 w-3 text-gold/80" strokeWidth={1.4} />
            Invite-only · Confidential
          </div>

          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-balance leading-[1.05]">
            Enter your <span className="gold-text italic">private invitation.</span>
          </h1>
          <p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-md">
            Aureliuss is reserved for principals, family offices, and their counsel. Your invitation is tied to your registered email — both must match to proceed.
          </p>

          <div className="mt-10 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground tracking-wide flex items-center gap-1.5 mb-1.5">
                <Mail className="h-3 w-3 text-gold/70" strokeWidth={1.4} />
                Registered email
                <span className="text-gold/80"> *</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setPreview(null);
                }}
                disabled={loading}
                placeholder="The email from your approval letter"
                className="field-input"
                autoComplete="email"
              />
            </div>

            <InviteCodeInput value={code} onChange={(v) => { setCode(v); setPreview(null); }} disabled={loading} />

            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-destructive/90 px-1"
                >
                  {error}
                </motion.p>
              )}
              {preview?.valid && (
                <motion.div
                  key="ok"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="panel rounded-2xl p-5 border border-gold/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gold/10 grid place-items-center shrink-0">
                      <Crown className="h-4 w-4 text-gold" strokeWidth={1.4} />
                    </div>
                    <div>
                      <p className="text-sm font-medium tracking-tight">
                        {preview.label ?? tierCopy[preview.tier!]}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tierCopy[preview.tier!]} ·{" "}
                        {preview.expiresAt
                          ? `Valid until ${new Date(preview.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
                          : "No expiry — founding allocation"}
                      </p>
                      {preview.assignedEmail && (
                        <p className="text-xs text-gold/80 mt-1.5">
                          Issued to {preview.assignedEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {!preview?.valid ? (
                <button
                  type="button"
                  disabled={!ready || loading}
                  onClick={handleVerify}
                  className="flex-1 h-12 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/92 disabled:opacity-40 transition-all duration-500 inline-flex items-center justify-center gap-2"
                >
                  {loading ? "Verifying…" : "Verify invitation"}
                  <KeyRound className="h-4 w-4" strokeWidth={1.5} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleEnter}
                  className="flex-1 h-12 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/92 transition-all duration-500 inline-flex items-center justify-center gap-2 shadow-luxury"
                >
                  Begin private onboarding
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-14 pt-10 border-t border-border/30">
            <p className="label-caps mb-3">Without an invitation</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Membership is curated. Submit a confidential application and our private office will review your profile.
            </p>
            <Link
              to="/waitlist"
              className="mt-5 inline-flex items-center gap-2 text-sm text-foreground hover:text-gold transition-colors"
            >
              Apply to the waitlist <Sparkles className="h-3.5 w-3.5 text-gold/70" strokeWidth={1.5} />
            </Link>
          </div>
        </motion.div>
      </div>

      <PremiumFooter variant="minimal" className="mt-auto shrink-0" />
    </ImmersiveScene>
  );
}
