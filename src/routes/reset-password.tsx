import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Lock } from "lucide-react";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { Logo } from "@/components/Logo";
import { resetPassword } from "@/lib/platform/client";

type Search = { token?: string };

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({ meta: [{ title: "Set New Password — Aurelius" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Invalid reset link.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, password);
      navigate({ to: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Logo className="mb-10" />
          <h1 className="font-display text-3xl tracking-tight mb-2">Set a new password</h1>
          <p className="text-sm text-muted-foreground mb-8">Minimum 8 characters. Use a unique passphrase for your private workspace.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.4} />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full field-input pl-11"
              />
            </div>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              className="w-full field-input"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading || !token} className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-50">
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>

          <Link to="/login" className="block text-center text-xs text-muted-foreground mt-8 hover:text-foreground">
            Return to sign in
          </Link>
        </motion.div>
      </div>
      <PremiumFooter variant="minimal" className="shrink-0" />
    </ImmersiveScene>
  );
}
