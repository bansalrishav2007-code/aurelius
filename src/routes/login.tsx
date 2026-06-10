import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { OTPInput } from "input-otp";
import { Logo } from "@/components/Logo";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { signInMember } from "@/lib/auth/client";
import { getPostAuthPath, redirectToDashboardAfterAuth } from "@/lib/auth/redirect-after-auth";
import { getAuthSession } from "@/lib/auth/session.functions";

type LoginSearch = { redirect?: string; expired?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    expired: typeof search.expired === "string" ? search.expired : undefined,
  }),
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (session) throw redirect({ to: getPostAuthPath(session) });
  },
  head: () => ({ meta: [{ title: "Sign in — Aurelius" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect: returnTo, expired } = Route.useSearch();
  const [step, setStep] = useState<"credentials" | "otp" | "2fa">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [twoFaHint, setTwoFaHint] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpHint, setOtpHint] = useState<string | null>(null);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!password || password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }
      const data = await signInMember(email, password);
      if ("requiresOtp" in data && data.requiresOtp) {
        setOtpHint(data.message ?? "Enter the code sent to your registered email.");
        setStep("otp");
        return;
      }
      if ("requires2fa" in data && data.requires2fa) {
        setTwoFaHint(
          data.method === "sms"
            ? "Enter the SMS code sent to your registered mobile."
            : "Enter the 6-digit code from your authenticator app.",
        );
        setStep("2fa");
        return;
      }
      if ("session" in data && data.ok) {
        const target = returnTo && returnTo.startsWith("/") ? returnTo : getPostAuthPath(data.session);
        window.location.href = target;
        return;
      }
      await redirectToDashboardAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handle2fa(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await signInMember(email, password, { totpCode, rememberDevice });
      if ("requiresOtp" in data && data.requiresOtp) {
        setOtpHint(data.message ?? "Enter the code sent to your registered email.");
        setStep("otp");
        return;
      }
      if ("session" in data && data.ok) {
        const target = returnTo && returnTo.startsWith("/") ? returnTo : getPostAuthPath(data.session);
        window.location.href = target;
        return;
      }
      throw new Error("Invalid two-factor code.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await signInMember(email, password, { otp, rememberDevice });
      if ("session" in data && data.ok) {
        const target = returnTo && returnTo.startsWith("/") ? returnTo : getPostAuthPath(data.session);
        window.location.href = target;
        return;
      }
      throw new Error("Invalid verification code.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
      <header className="relative z-10 px-6 lg:px-10 pt-8 flex items-center justify-between">
        <Logo />
        <Link to="/access" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          New member
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 lg:px-10 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hairline panel-muted text-[11px] text-muted-foreground mb-8 tracking-wide">
            <Lock className="h-3 w-3 text-gold/80" strokeWidth={1.4} />
            Returning member · Encrypted session
          </div>

          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-balance leading-[1.05]">
            Welcome back to <span className="gold-text italic">Aurelius.</span>
          </h1>
          <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
            {step === "credentials"
              ? "Sign in with your registered email and password."
              : step === "2fa"
                ? "Enter your two-factor authentication code."
                : "Enter the verification code to complete sign-in."}
          </p>

          {expired && (
            <p className="mt-4 text-sm text-amber-200/90 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2">
              Your session expired. Please log in again.
            </p>
          )}

          {step === "credentials" ? (
            <form onSubmit={handleCredentials} className="mt-10 space-y-4">
              <div>
                <label className="field-label">Principal email</label>
                <div className="relative mt-1.5">
                  <Mail className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.4} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@privateoffice.com"
                    className="w-full field-input pl-11"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Password</label>
                <div className="relative mt-1.5">
                  <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.4} />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your account password"
                    className="w-full field-input pl-11"
                  />
                </div>
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground mt-2 inline-block">
                  Forgot password?
                </Link>
              </div>

              {error && <p className="text-sm text-destructive/90 px-1">{error}</p>}

              <button
                type="submit"
                disabled={loading || !email.trim() || password.length < 8}
                className="btn-primary w-full h-12 shadow-luxury"
              >
                {loading ? "Verifying…" : "Continue"}
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </form>
          ) : step === "2fa" ? (
            <form onSubmit={handle2fa} className="mt-10 space-y-4">
              {twoFaHint && <p className="text-xs text-muted-foreground">{twoFaHint}</p>}
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className="field-input text-center tracking-[0.3em]"
                maxLength={6}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded accent-gold"
                />
                Remember this device for 30 days
              </label>
              {error && <p className="text-sm text-destructive/90 px-1">{error}</p>}
              <button type="submit" disabled={loading || totpCode.length !== 6} className="btn-primary w-full h-12 shadow-luxury">
                {loading ? "Verifying…" : "Verify & continue"}
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground w-full" onClick={() => setStep("credentials")}>
                ← Back
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtp} className="mt-10 space-y-4">
              {otpHint && <p className="text-xs text-muted-foreground">{otpHint}</p>}
              <div className="flex justify-center">
                <OTPInput
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  containerClassName="gap-2"
                  render={({ slots }) => (
                    <div className="flex gap-2">
                      {slots.map((slot, i) => (
                        <div
                          key={i}
                          className={`h-11 w-10 rounded-lg border text-center text-lg grid place-items-center ${
                            slot.isActive ? "border-gold" : "border-border/60"
                          }`}
                        >
                          {slot.char ?? slot.placeholderChar}
                        </div>
                      ))}
                    </div>
                  )}
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded accent-gold"
                />
                Remember this device for 30 days
              </label>

              {error && <p className="text-sm text-destructive/90 px-1">{error}</p>}

              <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full h-12 shadow-luxury">
                {loading ? "Signing in…" : "Complete sign-in"}
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>

              <button type="button" className="text-xs text-muted-foreground hover:text-foreground w-full" onClick={() => setStep("credentials")}>
                ← Back
              </button>
            </form>
          )}

          <div className="mt-10 panel rounded-2xl p-5 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" strokeWidth={1.4} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your data is private to your account. Every action is scoped to your membership only.
            </p>
          </div>
        </motion.div>
      </div>

      <PremiumFooter variant="minimal" className="mt-auto shrink-0" />
    </ImmersiveScene>
  );
}
