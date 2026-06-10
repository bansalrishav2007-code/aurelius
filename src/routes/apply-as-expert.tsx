import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Briefcase, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { submitExpertApplication } from "@/lib/experts/client";
import { toast } from "sonner";

export const Route = createFileRoute("/apply-as-expert")({
  head: () => ({ meta: [{ title: "Apply as Expert — Aurelius" }] }),
  component: ApplyAsExpertPage,
});

function ApplyAsExpertPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [qualification, setQualification] = useState("");
  const [councilNumber, setCouncilNumber] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [credentialsNote, setCredentialsNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitExpertApplication({
        fullName,
        email,
        qualification,
        councilNumber,
        specialisation,
        yearsExperience: Number(yearsExperience) || 0,
        linkedIn,
        credentialsNote,
      });
      setSubmitted(true);
      toast.success("Application received. Our team will review within 5 business days.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Aurelius
        </Link>
        <Logo className="h-6" />
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <Briefcase className="h-8 w-8 text-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl">Join the Aurelius network</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            CAs, lawyers, and wealth strategists — advise India&apos;s principals in a private, NDA-bound environment.
          </p>
        </div>

        {submitted ? (
          <div className="glass rounded-2xl p-8 text-center">
            <ShieldCheck className="h-10 w-10 text-success mx-auto mb-4" />
            <h2 className="font-display text-xl mb-2">Application received</h2>
            <p className="text-sm text-muted-foreground">
              The Aurelius team will review your credentials manually. On approval, you will receive portal login details by email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
            <input className="field-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input type="email" className="field-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="field-input" placeholder="Qualification (CA, LLB, CFA…)" value={qualification} onChange={(e) => setQualification(e.target.value)} required />
            <input className="field-input" placeholder="ICAI / Bar Council number" value={councilNumber} onChange={(e) => setCouncilNumber(e.target.value)} />
            <input className="field-input" placeholder="Specialisation" value={specialisation} onChange={(e) => setSpecialisation(e.target.value)} />
            <input type="number" className="field-input" placeholder="Years of experience" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
            <input className="field-input" placeholder="LinkedIn URL (optional)" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} />
            <textarea
              className="field-input resize-none"
              rows={3}
              placeholder="Brief note on credentials / notable clients (optional)"
              value={credentialsNote}
              onChange={(e) => setCredentialsNote(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              By applying you agree to Aurelius expert NDA terms. Client data cannot be exported or shared outside the platform.
            </p>
            <button type="submit" disabled={submitting} className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Submit application"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
