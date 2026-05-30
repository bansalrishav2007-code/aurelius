import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { signInMember } from "@/lib/auth/client";
import { getAuthSession } from "@/lib/auth/session.functions";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Sign in — Aureliuss" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInMember(email, password || undefined);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
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
            Welcome back to <span className="gold-text italic">Aureliuss.</span>
          </h1>
          <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
            Sign in with the email registered during your private onboarding. Access is limited to verified members only.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground tracking-wide">Principal email</label>
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
              <label className="text-xs text-muted-foreground tracking-wide">Password</label>
              <div className="relative mt-1.5">
                <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.4} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set during onboarding"
                  className="w-full field-input pl-11"
                />
              </div>
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground mt-2 inline-block">
                Forgot password?
              </Link>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-sm text-destructive/90 px-1"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/92 disabled:opacity-40 transition-all duration-500 inline-flex items-center justify-center gap-2 shadow-luxury"
            >
              {loading ? "Verifying membership…" : "Enter private workspace"}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </form>

          <div className="mt-10 panel rounded-2xl p-5 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" strokeWidth={1.4} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              No public registration. If you have not completed onboarding, use your personal invitation at{" "}
              <Link to="/access" className="text-foreground hover:underline underline-offset-4">
                private access
              </Link>
              .
            </p>
          </div>
        </motion.div>
      </div>

      <PremiumFooter variant="minimal" className="mt-auto shrink-0" />
    </ImmersiveScene>
  );
}
