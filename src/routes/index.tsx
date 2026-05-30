import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Crown,
  FileText,
  KeyRound,
  Landmark,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene, ParallaxSection } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { getAuthSession } from "@/lib/auth/session.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Aureliuss — Private Wealth Intelligence" },
      {
        name: "description",
        content: "An invite-only private wealth intelligence platform for India's principals, family offices, and their counsel.",
      },
      { property: "og:title", content: "Aureliuss — Private Wealth Intelligence" },
      {
        property: "og:description",
        content: "Discreet, AI-led wealth intelligence for India's HNWIs and family offices. By invitation only.",
      },
    ],
  }),
  component: Landing,
});

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

function Landing() {
  return (
    <ImmersiveScene variant="landing" className="text-foreground">
      <Nav />
      <Hero />
      <ParallaxSection id="why" depth="shallow">
        <WhyAureliuss />
      </ParallaxSection>
      <ParallaxSection id="security" depth="shallow">
        <SecurityPrivacy />
      </ParallaxSection>
      <ParallaxSection id="membership" depth="shallow">
        <HowMembershipWorks />
      </ParallaxSection>
      <ParallaxSection id="apply" depth="shallow">
        <WaitlistSection />
      </ParallaxSection>
      <PremiumFooter variant="full" />
    </ImmersiveScene>
  );
}

function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 mt-3">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="panel-elevated rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4"
        >
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#why" className="hover:text-foreground transition-colors">Why Aureliuss</a>
            <a href="#security" className="hover:text-foreground transition-colors">Security</a>
            <a href="#membership" className="hover:text-foreground transition-colors">Membership</a>
            <a href="#apply" className="hover:text-foreground transition-colors">Apply</a>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/login"
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              to="/waitlist"
              className="text-xs sm:text-sm bg-foreground text-background rounded-full px-4 py-2 hover:bg-foreground/90 transition-all inline-flex items-center gap-1"
            >
              Apply for access
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="landing-hero min-h-screen flex flex-col justify-center pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 w-full">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hairline panel-muted text-[11px] text-muted-foreground mb-6"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              Invite-only · Private wealth network
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.08 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] leading-[1.04] tracking-tight text-balance"
            >
              India&apos;s private wealth intelligence —{" "}
              <span className="gold-text italic">by invitation only.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.18 }}
              className="mt-5 text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed"
            >
              Aureliuss unifies wealth, legal, and tax intelligence for principals, promoters, and family offices — delivered with the discretion of a private bank and the precision of a research desk.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.28 }}
              className="mt-8 flex flex-col sm:flex-row gap-3"
            >
              <Link
                to="/waitlist"
                className="group bg-foreground text-background px-6 py-3 rounded-full text-sm font-medium hover:bg-foreground/90 transition-all inline-flex items-center justify-center gap-2 shadow-luxury"
              >
                Apply for access
                <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-full text-sm font-medium hairline panel-muted hover:border-gold/30 transition-all inline-flex items-center justify-center"
              >
                Sign in
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.45 }}
              className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-muted-foreground/80 uppercase tracking-[0.16em]"
            >
              {["SOC 2 Type II", "ISO 27001", "DPDP Compliant", "India data residency"].map((badge) => (
                <span key={badge} className="inline-flex items-center gap-2">
                  <Check className="h-3 w-3 text-gold/70" strokeWidth={1.5} />
                  {badge}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="panel-elevated rounded-3xl p-6 lg:p-7 shadow-luxury landing-hero-card"
          >
            <p className="label-caps mb-4">At a glance</p>
            <div className="space-y-3">
              {[
                { icon: Landmark, label: "Wealth Intelligence", desc: "Portfolio, entity, and succession visibility across your office." },
                { icon: Scale, label: "Legal Intelligence", desc: "FEMA, trusts, and corporate structuring — cited and current." },
                { icon: FileText, label: "Tax Intelligence", desc: "Direct tax, GST, and compliance risk — AY 2025-26 onward." },
              ].map((item) => (
                <div key={item.label} className="panel-muted rounded-xl p-4 flex gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gold/10 grid place-items-center shrink-0">
                    <item.icon className="h-4 w-4 text-gold" strokeWidth={1.4} />
                  </div>
                  <div>
                    <p className="text-sm font-medium tracking-tight">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Curated membership</span>
              <Link to="/access" className="text-foreground hover:text-gold transition-colors inline-flex items-center gap-1">
                Have an invitation? <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function WhyAureliuss() {
  const pillars = [
    {
      icon: Landmark,
      title: "Wealth Intelligence",
      desc: "A unified view of holdings, entities, and family-office structures — designed for principals who cannot afford blind spots.",
      points: ["Consolidated portfolio and entity mapping", "Succession and estate planning context", "Alternative assets and cross-border exposure"],
    },
    {
      icon: Scale,
      title: "Legal Intelligence",
      desc: "Corporate, trust, and regulatory intelligence with the rigour of counsel — without the wait for a partner callback.",
      points: ["FEMA, company law, and trust structuring", "Contract and deed-aware analysis", "Precedent-aware guidance for India"],
    },
    {
      icon: FileText,
      title: "Tax Intelligence",
      desc: "Indian direct tax, GST, and disclosure obligations — interpreted with section-level citations and practical structuring.",
      points: ["Income Tax Act & Finance Act updates", "Capital gains, GST, and transfer pricing", "Notice and compliance risk surfacing"],
    },
  ];

  return (
    <section className="landing-section">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <motion.div {...fadeUp} className="max-w-2xl mb-10">
          <p className="label-caps mb-3">Why Aureliuss</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight">
            Three intelligence layers.{" "}
            <span className="text-muted-foreground italic">One private office.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl">
            Built for India&apos;s wealth creators — not retail investors. Every module is designed for confidentiality, citation, and counsel-grade reasoning.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {pillars.map((pillar, i) => (
            <motion.article
              key={pillar.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              className="panel-elevated rounded-2xl p-6 lg:p-7 lift h-full flex flex-col"
            >
              <div className="h-10 w-10 rounded-xl bg-gold/10 grid place-items-center mb-5">
                <pillar.icon className="h-5 w-5 text-gold" strokeWidth={1.3} />
              </div>
              <h3 className="font-display text-xl mb-2">{pillar.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{pillar.desc}</p>
              <ul className="mt-auto space-y-2.5 text-xs text-muted-foreground">
                {pillar.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-gold mt-0.5 shrink-0" strokeWidth={1.5} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecurityPrivacy() {
  const items = [
    { k: "AES-256", v: "Encryption at rest" },
    { k: "TLS 1.3", v: "Encryption in transit" },
    { k: "Zero-knowledge", v: "Vault architecture" },
    { k: "DPDP Act", v: "Privacy compliant" },
    { k: "India", v: "Data residency" },
    { k: "Invite-only", v: "Access control" },
  ];

  return (
    <section className="landing-section">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="panel-elevated rounded-3xl p-6 lg:p-10">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-12 items-start">
            <motion.div {...fadeUp}>
              <div className="inline-flex items-center gap-2 text-gold mb-4">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.3} />
                <span className="label-caps !text-gold/90">Security & privacy</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-tight">
                Your wealth is private.{" "}
                <span className="text-muted-foreground italic">So is your data.</span>
              </h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Aureliuss is architected like a custodian — not a consumer app. Documents are encrypted, sessions are gated, and membership is verified before a vault is ever provisioned.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                {[
                  "End-to-end encrypted document vault",
                  "One-time invite codes bound to your email",
                  "No public signup — curated onboarding only",
                  "Audit-ready controls for family offices",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Lock className="h-3.5 w-3.5 text-gold mt-1 shrink-0" strokeWidth={1.4} />
                    {line}
                  </li>
                ))}
              </ul>
              <Link
                to="/security"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-foreground hover:text-gold transition-colors"
              >
                Read our security posture <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>

            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((item) => (
                <div key={item.k} className="panel-muted rounded-xl py-5 px-4 text-center">
                  <div className="font-display text-lg sm:text-xl gold-text">{item.k}</div>
                  <div className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider">{item.v}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowMembershipWorks() {
  const steps = [
    {
      icon: UserCheck,
      step: "01",
      title: "Submit application",
      desc: "Complete a confidential waitlist form. Share your profile, profession, and why you seek access.",
    },
    {
      icon: Sparkles,
      step: "02",
      title: "Private office review",
      desc: "Our team reviews a limited cohort each quarter. Applications are never mass-processed.",
    },
    {
      icon: KeyRound,
      step: "03",
      title: "Personal invitation",
      desc: "Approved members receive a one-time invite code tied to their registered email — never transferable.",
    },
    {
      icon: Crown,
      step: "04",
      title: "Vault provisioning",
      desc: "Verify your invitation, complete onboarding, and enter your encrypted intelligence workspace.",
    },
  ];

  return (
    <section className="landing-section">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-10">
          <p className="label-caps mb-3">How membership works</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight">
            Curated access,{" "}
            <span className="gold-text italic">not open registration.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Aureliuss Private is membership into a network — not a freemium product. Every step is designed to preserve discretion and trust.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.07 }}
              className="panel-elevated rounded-2xl p-5 lg:p-6 relative"
            >
              <span className="text-[10px] font-mono text-gold/70 tracking-widest">{item.step}</span>
              <div className="h-9 w-9 rounded-lg bg-gold/10 grid place-items-center my-4">
                <item.icon className="h-4 w-4 text-gold" strokeWidth={1.4} />
              </div>
              <h3 className="font-display text-lg mb-2">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WaitlistSection() {
  return (
    <section className="landing-section landing-section--cta pb-20">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <motion.div {...fadeUp} className="panel-elevated rounded-3xl p-8 lg:p-12 text-center shadow-luxury">
          <p className="label-caps mb-3">Apply for access</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-balance max-w-3xl mx-auto">
            Request membership to{" "}
            <span className="gold-text italic">Aureliuss Private.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            We onboard principals, promoters, and family offices by invitation. Submit a confidential application — if your profile aligns, you will receive a personal access code by email.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/waitlist"
              className="w-full sm:w-auto bg-foreground text-background rounded-full px-8 h-12 text-sm font-medium hover:bg-foreground/90 transition-all inline-flex items-center justify-center gap-2 shadow-luxury"
            >
              Apply for access
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/access"
              className="w-full sm:w-auto hairline panel-muted rounded-full px-8 h-12 text-sm font-medium inline-flex items-center justify-center hover:border-gold/30 transition-all"
            >
              I have an invitation
            </Link>
          </div>

          <p className="mt-6 text-[11px] text-muted-foreground/70 max-w-md mx-auto">
            Typical review window: 5–10 business days. All applications handled under strict confidentiality.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
