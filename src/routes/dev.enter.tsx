import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useState } from "react";
import { AlertTriangle, ArrowRight, FlaskConical, Mail, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { enterDevBypassSession } from "@/lib/auth/client";
import { devBypassRequiresSecret, isDevBypassEnabled } from "@/lib/auth/dev-bypass.server";
import { getPostAuthPath, redirectToDashboardAfterAuth } from "@/lib/auth/redirect-after-auth";
import { getAuthSession } from "@/lib/auth/session.functions";

const getDevEnterContext = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: isDevBypassEnabled(),
  requiresSecret: devBypassRequiresSecret(),
}));

export const Route = createFileRoute("/dev/enter")({
  loader: async () => getDevEnterContext(),
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (session) throw redirect({ to: getPostAuthPath(session) });
  },
  head: () => ({ meta: [{ title: "Dev Entry — Aurelius" }] }),
  component: DevEnterPage,
});

function DevEnterPage() {
  const { enabled, requiresSecret } = Route.useLoaderData();
  const [fullName, setFullName] = useState("Dev Principal");
  const [email, setEmail] = useState("dev@aurelius.local");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ready = fullName.trim().length > 1 && email.includes("@") && (!requiresSecret || secret.trim().length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      await enterDevBypassSession({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        secret: requiresSecret ? secret.trim() : undefined,
      });
      await redirectToDashboardAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to enter dev workspace.");
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-200/90 mb-8 tracking-wide">
            <FlaskConical className="h-3 w-3" strokeWidth={1.4} />
            Temporary dev bypass · Remove before OTP launch
          </div>

          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-balance leading-[1.05] text-center">
            Enter the <span className="gold-text italic">workspace.</span>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground text-center leading-relaxed">
            Skip OTP for now, seed sample data, and land on the real member dashboard to test features one by one.
          </p>

          {!enabled ? (
            <div className="mt-10 panel-elevated rounded-3xl p-6 sm:p-8 space-y-3 text-center">
              <AlertTriangle className="h-5 w-5 text-amber-400 mx-auto" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">
                Dev bypass is off. Set <code className="text-foreground">DEV_BYPASS_ENABLED=true</code> in your{" "}
                <code className="text-foreground">.env</code> and restart the dev server.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 panel-elevated rounded-3xl p-6 sm:p-8 space-y-4 shadow-luxury">
              <div>
                <label className="text-xs text-muted-foreground tracking-wide flex items-center gap-1.5 mb-1.5">
                  <User className="h-3 w-3 text-gold/70" strokeWidth={1.4} />
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  placeholder="Your name"
                  className="field-input"
                  autoComplete="name"
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
                  placeholder="dev@aurelius.local"
                  className="field-input"
                  autoComplete="email"
                />
              </div>

              {requiresSecret && (
                <div>
                  <label className="text-xs text-muted-foreground tracking-wide mb-1.5 block">Dev secret</label>
                  <input
                    type="password"
                    required
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    disabled={loading}
                    placeholder="From DEV_BYPASS_SECRET"
                    className="field-input"
                    autoComplete="off"
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!ready || loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? "Preparing workspace…" : "Enter dashboard"}
                {!loading && <ArrowRight className="h-4 w-4" strokeWidth={1.5} />}
              </button>

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                Creates a principal-tier member with seeded goals, vault documents, and chat history. Same email re-enters
                your existing workspace.
              </p>
            </form>
          )}
        </motion.div>
      </div>

      <PremiumFooter />
    </ImmersiveScene>
  );
}
