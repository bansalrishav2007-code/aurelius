import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Mail, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { startDemoSession } from "@/lib/auth/client";
import { getPostAuthPath } from "@/lib/auth/redirect-after-auth";
import { getAuthSession } from "@/lib/auth/session.functions";
import { DEMO_PURPOSE_OPTIONS } from "@/lib/demo/workspace-data";

export const Route = createFileRoute("/demo/")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (session?.isDemo) throw redirect({ to: "/demo/workspace" });
    if (session) throw redirect({ to: getPostAuthPath(session) });
  },
  head: () => ({ meta: [{ title: "Demo — Aurelius Private Office" }] }),
  component: DemoLandingPage,
});

function DemoLandingPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ready = firstName.trim().length > 0 && email.includes("@") && purpose.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      await startDemoSession({
        firstName: firstName.trim(),
        email: email.trim().toLowerCase(),
        purpose,
      });
      navigate({ to: "/demo/workspace", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to enter demo workspace.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
      <header className="relative z-10 px-6 lg:px-10 pt-8 flex items-center justify-between">
        <Logo />
        <Link to="/waitlist" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Full membership
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 lg:px-10 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-balance leading-[1.05] text-center">
            Take a look at <span className="gold-text italic">Aurelius</span>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground text-center leading-relaxed">
            Enter your private demo office workspace
          </p>

          <form onSubmit={handleSubmit} className="mt-10 panel-elevated rounded-3xl p-6 sm:p-8 space-y-4 shadow-luxury">
            <div>
              <label className="text-xs text-muted-foreground tracking-wide flex items-center gap-1.5 mb-1.5">
                <User className="h-3 w-3 text-gold/70" strokeWidth={1.4} />
                First name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
                placeholder="Your first name"
                className="field-input"
                autoComplete="given-name"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground tracking-wide flex items-center gap-1.5 mb-1.5">
                <Mail className="h-3 w-3 text-gold/70" strokeWidth={1.4} />
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="you@company.com"
                className="field-input"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground tracking-wide mb-1.5 block">Purpose of use</label>
              <select
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={loading}
                className="field-input"
              >
                <option value="">Select purpose</option>
                {DEMO_PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-destructive/90 px-1">{error}</p>}

            <button type="submit" disabled={!ready || loading} className="btn-primary w-full h-12 shadow-luxury">
              {loading ? "Entering workspace…" : "Enter Demo Workspace"}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground/80 leading-relaxed">
            Demo uses sample data only. No real accounts or documents are accessed.
          </p>
        </motion.div>
      </div>

      <PremiumFooter variant="minimal" className="mt-auto shrink-0" />
    </ImmersiveScene>
  );
}
