import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { Logo } from "@/components/Logo";
import { requestPasswordReset } from "@/lib/platform/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset Password — Aureliuss" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      if (res.devToken) {
        setDevLink(`/reset-password?token=${res.devToken}`);
      }
      setDone(true);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/login" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-10">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
          <Logo className="mb-10" />
          <h1 className="font-display text-3xl tracking-tight mb-2">Reset your password</h1>
          <p className="text-sm text-muted-foreground mb-8">We will issue a secure reset link if a membership exists for this email.</p>

          {done ? (
            <div className="panel-elevated rounded-2xl p-6 text-sm text-muted-foreground">
              If your email is registered, reset instructions have been issued. Check your inbox.
              {devLink && (
                <p className="mt-4 text-xs">
                  Dev mode:{" "}
                  <Link to={devLink} className="text-foreground underline underline-offset-4">
                    Reset password now
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
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
              <button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-50">
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
      <PremiumFooter variant="minimal" className="shrink-0" />
    </ImmersiveScene>
  );
}
