import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Crown, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { fetchMembershipSettings, submitMembershipApplication } from "@/lib/membership/client";
import type { InviteCode } from "@/lib/auth/types";
import { TIER_LABELS } from "@/lib/membership/access";

export const Route = createFileRoute("/apply")({
  head: () => ({ meta: [{ title: "Apply for Membership — Aurelius" }] }),
  component: ApplyPage,
});

const tierOptions: { value: InviteCode["tier"]; label: string; desc: string }[] = [
  { value: "principal", label: "Principal", desc: "Individual wealth owners · 1 user" },
  { value: "family-office", label: "Family Office", desc: "Multi-member family · up to 5 users" },
  { value: "founding", label: "Founder", desc: "Complex structures · up to 3 users + dedicated expert" },
];

function ApplyPage() {
  const [inviteOnly, setInviteOnly] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tierApplying, setTierApplying] = useState<InviteCode["tier"]>("principal");
  const [netWorthRange, setNetWorthRange] = useState<"1-5cr" | "5-25cr" | "25cr+">("5-25cr");
  const [primaryNeed, setPrimaryNeed] = useState<"tax" | "wealth" | "legal" | "all">("all");
  const [hearAbout, setHearAbout] = useState("");
  const [whyAccess, setWhyAccess] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsWarning, setTermsWarning] = useState(false);

  useEffect(() => {
    fetchMembershipSettings()
      .then((s) => setInviteOnly(s.inviteOnlyMode))
      .catch(() => setInviteOnly(true))
      .finally(() => setLoadingSettings(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted) {
      setTermsWarning(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitMembershipApplication({
        fullName,
        phone,
        email,
        tierApplying,
        netWorthRange,
        primaryNeed,
        hearAbout,
        whyAccess: inviteOnly ? "Waitlist interest" : whyAccess,
        waitlistOnly: inviteOnly,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
      <header className="relative z-10 px-6 lg:px-10 pt-8 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <Logo />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 lg:px-10 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <Crown className="h-8 w-8 text-gold mx-auto mb-4" />
            <h1 className="font-display text-3xl tracking-tight">
              {inviteOnly ? "Join the waitlist" : "Apply for membership"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {inviteOnly
                ? "Aurelius is invite-only. Leave your details and we will reach out when a seat opens."
                : "Private wealth intelligence for India's principals. All applications are reviewed manually."}
            </p>
          </div>

          {submitted ? (
            <div className="glass rounded-2xl p-8 text-center border border-gold/20">
              <ShieldCheck className="h-10 w-10 text-gold mx-auto mb-4" />
              <h2 className="font-display text-xl mb-2">Application received</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your application is under review. We&apos;ll be in touch within 48 hours.
              </p>
            </div>
          ) : loadingSettings ? (
            <div className="glass rounded-2xl p-12 grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4 border border-border/40">
              <input
                className="field-input"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <input
                type="tel"
                className="field-input"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <input
                type="email"
                className="field-input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {!inviteOnly && (
                <>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Membership tier</p>
                    <div className="space-y-2">
                      {tierOptions.map((t) => (
                        <label
                          key={t.value}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            tierApplying === t.value ? "border-gold/50 bg-gold/5" : "border-border/40 hover:border-border"
                          }`}
                        >
                          <input
                            type="radio"
                            name="tier"
                            className="mt-1"
                            checked={tierApplying === t.value}
                            onChange={() => setTierApplying(t.value)}
                          />
                          <div>
                            <p className="text-sm font-medium">{t.label}</p>
                            <p className="text-xs text-muted-foreground">{t.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <select
                    className="field-input"
                    value={netWorthRange}
                    onChange={(e) => setNetWorthRange(e.target.value as typeof netWorthRange)}
                  >
                    <option value="1-5cr">Net worth ₹1–5 Cr</option>
                    <option value="5-25cr">Net worth ₹5–25 Cr</option>
                    <option value="25cr+">Net worth ₹25 Cr+</option>
                  </select>

                  <select
                    className="field-input"
                    value={primaryNeed}
                    onChange={(e) => setPrimaryNeed(e.target.value as typeof primaryNeed)}
                  >
                    <option value="tax">Primary need: Tax</option>
                    <option value="wealth">Primary need: Wealth</option>
                    <option value="legal">Primary need: Legal</option>
                    <option value="all">Primary need: All</option>
                  </select>

                  <input
                    className="field-input"
                    placeholder="How did you hear about us?"
                    value={hearAbout}
                    onChange={(e) => setHearAbout(e.target.value)}
                  />

                  <textarea
                    className="field-input resize-none"
                    rows={3}
                    placeholder="Why do you want access?"
                    value={whyAccess}
                    onChange={(e) => setWhyAccess(e.target.value)}
                    required
                  />
                </>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (e.target.checked) setTermsWarning(false);
                  }}
                  className="mt-0.5 rounded border-border"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I have read and agree to the{" "}
                  <a
                    href="/terms-and-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#c9a84c] hover:underline"
                  >
                    Terms &amp; Conditions
                  </a>{" "}
                  and{" "}
                  <a
                    href="/terms-and-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#c9a84c] hover:underline"
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>

              {termsWarning && (
                <p className="text-xs text-amber-400/90">Please accept the Terms &amp; Conditions to continue</p>
              )}

              <button
                type="submit"
                disabled={submitting || !termsAccepted}
                className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-40"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : inviteOnly ? "Join waitlist" : "Submit application"}
              </button>

              {!inviteOnly && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Applying for {TIER_LABELS[tierApplying]} · Reviewed within 48 hours
                </p>
              )}
            </form>
          )}
        </div>
      </main>

      <PremiumFooter variant="minimal" className="shrink-0" />
    </ImmersiveScene>
  );
}
