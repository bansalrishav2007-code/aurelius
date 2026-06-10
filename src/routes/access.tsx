import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, KeyRound, Lock, Mail, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { InviteCodeInput, formatInviteDisplay } from "@/components/auth/InviteCodeInput";
import { isCompleteInviteCode } from "@/lib/auth/invite-code";
import { registerWithInvite } from "@/lib/auth/client";
import { getPostAuthPath, redirectToDashboardAfterAuth } from "@/lib/auth/redirect-after-auth";
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
    if (session) throw redirect({ to: getPostAuthPath(session) });
  },
  head: () => ({ meta: [{ title: "Activate Membership — Aurelius" }] }),
  component: AccessPage,
});

function AccessPage() {
  const { code: codeParam, email: emailParam } = Route.useSearch();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("AURE");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
    if (codeParam) setCode(codeParam.replace(/[^A-Z0-9]/gi, "").toUpperCase());
  }, [codeParam, emailParam]);

  const displayCode = formatInviteDisplay(code);
  const ready = email.trim().includes("@") && password.length >= 8 && isCompleteInviteCode(code);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      await registerWithInvite({
        email: email.trim().toLowerCase(),
        password,
        inviteCode: displayCode,
        fullName: fullName.trim() || undefined,
      });
      await redirectToDashboardAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
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
            Activate your <span className="gold-text italic">membership.</span>
          </h1>
          <p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-md">
            Enter the email from your approval letter, create a secure password, and your personal invitation code to access Aurelius.
          </p>

          <form onSubmit={handleRegister} className="mt-10 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground tracking-wide mb-1.5 block">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                placeholder="As on your invitation"
                className="field-input"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground tracking-wide flex items-center gap-1.5 mb-1.5">
                <Mail className="h-3 w-3 text-gold/70" strokeWidth={1.4} />
                Registered email
                <span className="text-gold/80"> *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="The email from your approval letter"
                className="field-input"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground tracking-wide flex items-center gap-1.5 mb-1.5">
                <Lock className="h-3 w-3 text-gold/70" strokeWidth={1.4} />
                Password
                <span className="text-gold/80"> *</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Minimum 8 characters"
                className="field-input"
                autoComplete="new-password"
              />
            </div>

            <InviteCodeInput value={code} onChange={setCode} disabled={loading} />

            {error && <p className="text-sm text-destructive/90 px-1">{error}</p>}

            <button
              type="submit"
              disabled={!ready || loading}
              className="btn-primary w-full h-12 shadow-luxury"
            >
              {loading ? "Creating your account…" : "Create account & enter Aurelius"}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
              Your invitation code is single-use and bound to your registered email.
            </p>
          </form>

          <div className="mt-10 pt-8 border-t border-border/30">
            <p className="label-caps mb-3">Explore first</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Preview the Aurelius dashboard with sample data — no invitation required.
            </p>
            <Link
              to="/demo"
              className="mt-4 inline-flex items-center gap-2 text-sm text-gold hover:text-gold/80 transition-colors"
            >
              Try the interactive demo <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>

          <div className="mt-10 pt-10 border-t border-border/30">
            <p className="label-caps mb-3">Without an invitation</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Membership is curated. Submit a confidential application — email verification is required before review.
            </p>
            <Link
              to="/waitlist"
              className="mt-5 inline-flex items-center gap-2 text-sm text-foreground hover:text-gold transition-colors"
            >
              Apply for membership <Sparkles className="h-3.5 w-3.5 text-gold/70" strokeWidth={1.5} />
            </Link>
          </div>
        </motion.div>
      </div>

      <PremiumFooter variant="minimal" className="mt-auto shrink-0" />
    </ImmersiveScene>
  );
}
