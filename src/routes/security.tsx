import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Database, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Aurelius" },
      {
        name: "description",
        content: "How Aurelius protects private wealth data — encryption, compliance, access control, and data policy.",
      },
    ],
  }),
  component: SecurityPage,
});

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

function SecurityPage() {
  return (
    <ImmersiveScene variant="landing" className="text-foreground min-h-screen flex flex-col">
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 mt-3">
          <div className="panel-elevated rounded-2xl px-5 py-3 flex items-center justify-between gap-4">
            <Logo size="md" />
            <Link to="/" className="btn-ghost text-sm inline-flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeUp} className="mb-12">
            <p className="label-caps text-gold/90 mb-4">Security & privacy</p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight text-balance">
              Your wealth is private.{" "}
              <span className="text-muted-foreground italic">So is your data.</span>
            </h1>
            <p className="mt-5 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
              Aurelius is built for principals who treat confidentiality as non-negotiable. Every layer — from encryption to membership — is designed for private wealth, not mass-market finance.
            </p>
          </motion.div>

          <div className="space-y-5">
            <SecuritySection
              icon={Lock}
              title="Encryption"
              items={[
                "AES-256 encryption at rest for documents and vault assets",
                "TLS 1.3 encryption in transit for all sessions and API traffic",
                "Zero-knowledge vault architecture — member-scoped, isolated storage paths",
              ]}
            />
            <SecuritySection
              icon={ShieldCheck}
              title="Compliance"
              items={[
                "DPDP Act compliant privacy practices for Indian members",
                "India data residency — your intelligence stays within jurisdiction",
                "SOC 2 Type II aligned operations and controls",
                "ISO 27001 aligned information security management",
              ]}
            />
            <SecuritySection
              icon={KeyRound}
              title="Access Control"
              items={[
                "Invite-only membership — no open registration pathway",
                "One-time, non-transferable access codes bound to verified email",
                "No public signup — curated onboarding by the private office only",
              ]}
            />
            <SecuritySection
              icon={Database}
              title="Data policy"
              items={[
                "We never sell your data.",
                "We never share your data with third parties.",
                "We never use your data for advertising.",
              ]}
            />
          </div>

          <motion.blockquote
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.12 }}
            className="mt-12 landing-testimonial-card px-8 py-10 sm:px-12 sm:py-14 text-center"
          >
            <p className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight gold-text leading-snug text-balance">
              &ldquo;Architected like a custodian. Not a consumer app.&rdquo;
            </p>
          </motion.blockquote>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }} className="mt-10 text-center">
            <Link to="/waitlist" className="btn-primary btn-pill h-12 px-8 shadow-luxury mobile-btn-full">
              Apply for access
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </main>

      <PremiumFooter variant="minimal" className="shrink-0" />
    </ImmersiveScene>
  );
}

function SecuritySection({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Lock;
  title: string;
  items: string[];
}) {
  return (
    <motion.section {...fadeUp} className="panel-elevated rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-gold/10 grid place-items-center shrink-0">
          <Icon className="h-5 w-5 text-gold" strokeWidth={1.3} />
        </div>
        <h2 className="font-display text-xl sm:text-2xl tracking-tight">{title}</h2>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
            <span className="h-1.5 w-1.5 rounded-full bg-gold/70 mt-2 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
