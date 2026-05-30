import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, Check, Send, Shield } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { submitWaitlist } from "@/lib/auth/client";
import { getAuthSession } from "@/lib/auth/session.functions";

export const Route = createFileRoute("/waitlist")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Waitlist — Aureliuss" }] }),
  component: WaitlistPage,
});

const netWorthBands = [
  "Prefer not to disclose",
  "₹25–50 Cr",
  "₹50–100 Cr",
  "₹100–250 Cr",
  "₹250 Cr+",
  "Family office AUM ₹500 Cr+",
];

function WaitlistPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    profession: "",
    netWorthBand: "",
    whyAccess: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await submitWaitlist({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        profession: form.profession,
        netWorthBand: form.netWorthBand || undefined,
        whyAccess: form.whyAccess,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-2xl mx-auto px-6 lg:px-10 py-12 lg:py-20 w-full">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-10 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Aureliuss
        </Link>

        <Logo className="mb-10" />

        {done ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel-elevated rounded-3xl p-10 text-center">
            <div className="h-14 w-14 rounded-2xl bg-gold/10 grid place-items-center mx-auto mb-6">
              <Shield className="h-6 w-6 text-gold" strokeWidth={1.5} />
            </div>
            <p className="label-caps mb-3">Application under review</p>
            <h1 className="font-display text-3xl tracking-tight mb-3">Your request is confidential</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Our private office reviews a limited cohort each quarter. If your profile aligns with Aureliuss Private, you will receive a personal invitation — never a mass email — with a one-time access code tied to this email address.
            </p>
            <p className="mt-6 text-xs text-muted-foreground/80 max-w-xs mx-auto">
              Typical review window: 5–10 business days. No follow-up is required.
            </p>
            <Link to="/access" className="mt-8 inline-block text-sm text-foreground underline underline-offset-4">
              Already received an invitation?
            </Link>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}>
            <p className="label-caps mb-4">Confidential application</p>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight text-balance leading-[1.05]">
              Request membership to <span className="gold-text italic">Aureliuss Private.</span>
            </h1>
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
              We serve principals, promoters, and family offices. All fields are handled under strict confidentiality and reviewed by our private office.
            </p>

            <form onSubmit={handleSubmit} className="mt-10 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Full name" required>
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    className="field-input"
                    placeholder="Legal name"
                    autoComplete="name"
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="field-input"
                    placeholder="principal@office.com"
                    autoComplete="email"
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Phone number" required>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="field-input"
                    placeholder="+91 · · · · · · · · · ·"
                    autoComplete="tel"
                  />
                </Field>
                <Field label="Profession" required>
                  <input
                    required
                    value={form.profession}
                    onChange={(e) => update("profession", e.target.value)}
                    className="field-input"
                    placeholder="Principal, promoter, CIO…"
                  />
                </Field>
              </div>

              <Field label="Net worth range">
                <select
                  value={form.netWorthBand}
                  onChange={(e) => update("netWorthBand", e.target.value)}
                  className="field-input"
                >
                  <option value="">Optional — select if comfortable</option>
                  {netWorthBands.map((b) => (
                    <option key={b} value={b === "Prefer not to disclose" ? "" : b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Why do you want access?" required>
                <textarea
                  required
                  value={form.whyAccess}
                  onChange={(e) => update("whyAccess", e.target.value)}
                  rows={5}
                  className="field-input resize-none h-auto py-3"
                  placeholder="Tell us about your wealth structure, priorities, and what you hope Aureliuss will unlock for your office."
                />
              </Field>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/92 disabled:opacity-50 transition-all inline-flex items-center justify-center gap-2 shadow-luxury"
              >
                {loading ? "Submitting confidential application…" : "Submit confidential application"}
                <Send className="h-4 w-4" strokeWidth={1.5} />
              </button>

              <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
                By submitting, you confirm the information is accurate and consent to confidential review by Aureliuss Private.
              </p>
            </form>

            <p className="mt-8 text-xs text-muted-foreground text-center">
              Have an invitation?{" "}
              <Link to="/access" className="text-foreground hover:underline underline-offset-4">
                Enter private access
              </Link>
            </p>
          </motion.div>
        )}
      </div>

      <PremiumFooter variant="minimal" className="mt-auto shrink-0" />
    </ImmersiveScene>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground tracking-wide">
        {label}
        {required && <span className="text-gold/80"> *</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
