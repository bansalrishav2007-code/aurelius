import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Crown,
  FileText,
  KeyRound,
  Landmark,
  Lock,
  Menu,
  Minus,
  Play,
  X,
  Scale,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ImmersiveScene, ParallaxSection } from "@/components/immersive";
import LiveIntelligenceFeed from "@/components/LiveIntelligenceFeed";
import { ProductGlimpseSection } from "@/components/landing/ProductGlimpseSection";
import { MembershipTiersSection } from "@/components/membership/MembershipTiersSection";
import { PremiumFooter } from "@/components/PremiumFooter";
import { getAuthSession } from "@/lib/auth/session.functions";
import { getPostAuthPath } from "@/lib/auth/redirect-after-auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (session) throw redirect({ to: getPostAuthPath(session) });
  },
  head: () => ({
    meta: [
      { title: "Aurelius — Private Wealth Intelligence" },
      {
        name: "description",
        content: "An invite-only private wealth intelligence platform for India's principals, family offices, and their counsel.",
      },
      { property: "og:title", content: "Aurelius — Private Wealth Intelligence" },
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

function SectionEyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`landing-section-eyebrow ${className}`.trim()}>{children}</p>;
}

function Landing() {
  return (
    <ImmersiveScene variant="landing" className="text-foreground">
      <Nav />
      <Hero />
      <ParallaxSection id="why-now" depth="shallow">
        <WhyNowSection />
      </ParallaxSection>
      <ParallaxSection id="why" depth="shallow">
        <WhyAurelius />
      </ParallaxSection>
      <ParallaxSection id="private-office" depth="shallow">
        <ProductGlimpseSection />
      </ParallaxSection>
      <ParallaxSection id="intelligence" depth="shallow">
        <LiveIntelligenceFeed />
      </ParallaxSection>
      <ParallaxSection id="security" depth="shallow">
        <SecurityPrivacy />
      </ParallaxSection>
      <ParallaxSection id="tiers" depth="shallow">
        <MembershipTiersSection />
      </ParallaxSection>
      <ParallaxSection id="testimonial" depth="shallow">
        <MemberTestimonial />
      </ParallaxSection>
      <ParallaxSection id="membership" depth="shallow">
        <HowMembershipWorks />
      </ParallaxSection>
      <ParallaxSection id="compare" depth="shallow">
        <DifferentiationTable />
      </ParallaxSection>
      <ParallaxSection id="founder-video" depth="shallow">
        <FounderVideoSection />
      </ParallaxSection>
      <ParallaxSection id="faq" depth="shallow">
        <FaqSection />
      </ParallaxSection>
      <ParallaxSection id="apply" depth="shallow">
        <WaitlistSection />
      </ParallaxSection>
      <PremiumFooter variant="full" />
    </ImmersiveScene>
  );
}

const landingNavLinks = [
  { label: "Why Aurelius", href: "#why", isAnchor: true },
  { label: "Demo", to: "/demo" as const, isAnchor: false },
  { label: "Security", to: "/security" as const, isAnchor: false },
  { label: "Membership", href: "#membership", isAnchor: true },
  { label: "Apply", href: "#apply", isAnchor: true },
] as const;

function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 mt-3">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="panel-elevated rounded-2xl px-5 py-3 flex items-center justify-between gap-4"
        >
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-7" aria-label="Main">
            {landingNavLinks.map((item) =>
              item.isAnchor ? (
                <a key={item.label} href={item.href} className="nav-link">
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} to={item.to} className="nav-link">
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden h-9 w-9 grid place-items-center rounded-lg hover:bg-muted/40 transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Link to="/login" className="btn-ghost hidden sm:inline-flex px-2">
              Sign in
            </Link>
            <Link to="/apply" className="btn-primary btn-sm btn-pill btn-nav-cta">
              Apply for access
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="md:hidden panel-elevated rounded-2xl mt-2 px-4 py-3 flex flex-col gap-1"
              aria-label="Mobile main"
            >
              {landingNavLinks.map((item) =>
                item.isAnchor ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className="nav-link py-2.5 px-2 rounded-lg hover:bg-muted/30"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="nav-link py-2.5 px-2 rounded-lg hover:bg-muted/30"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </motion.nav>
          )}
        </AnimatePresence>
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
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hairline panel-muted text-sm text-muted-foreground mb-6"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              Invite-only · Private wealth network
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.08 }}
              className="landing-hero__title font-display tracking-tight text-balance"
            >
              A private wealth operating system —{" "}
              <span className="gold-text italic">for founders and families.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.18 }}
              className="mt-5 text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed"
            >
              Built for founders, HNIs, and family offices managing complex wealth structures.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.28 }}
              className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
            >
              <Link to="/apply" className="btn-primary btn-pill h-12 px-7 shadow-luxury group mobile-btn-full sm:w-auto">
                Apply for access
                <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link to="/login" className="btn-secondary btn-pill h-12 px-7 mobile-btn-full sm:w-auto">
                Sign in
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.45 }}
              className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground/80 uppercase tracking-[0.12em]"
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
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
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

function WhyNowSection() {
  const stats = [
    { value: "₹930 Lakh Crore", label: "India's total household wealth" },
    { value: "13%", label: "Family businesses surviving to the third generation" },
    { value: "Only", label: "Platform connecting legal and tax intelligence together" },
  ];

  return (
    <section className="landing-section landing-section--spacious landing-why-now">
      <div className="max-w-5xl mx-auto px-5 lg:px-8 text-center">
        <motion.div {...fadeUp}>
          <SectionEyebrow className="mb-5">Why now</SectionEyebrow>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight text-balance">
            India&apos;s <span className="gold-text">wealth is growing.</span>
          </h2>
          <p className="mt-4 font-display text-xl sm:text-2xl lg:text-3xl text-muted-foreground italic tracking-tight text-balance">
            The infrastructure to protect it hasn&apos;t kept up.
          </p>
        </motion.div>

        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              className="landing-stat-card px-6 py-8 sm:px-8 sm:py-10"
            >
              <p className="font-display text-2xl sm:text-3xl lg:text-4xl gold-text tracking-tight leading-none">
                {stat.value}
              </p>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed text-balance">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.28 }}
          className="mt-12 sm:mt-16 font-display text-xl sm:text-2xl tracking-tight text-foreground/90"
        >
          Aurelius is built for this moment.
        </motion.p>
      </div>
    </section>
  );
}

function FounderVideoSection() {
  return (
    <section className="landing-section landing-video-section">
      <div className="max-w-5xl mx-auto px-5 lg:px-8">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <SectionEyebrow className="mb-4">Why we built Aurelius</SectionEyebrow>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight text-balance">
            A message from our founder.
          </h2>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.08 }}
          className="landing-video-thumb max-w-4xl mx-auto"
          role="img"
          aria-label="Founder's note video — coming soon"
        >
          <div className="landing-video-thumb__inner">
            <div className="landing-video-thumb__play" aria-hidden>
              <Play className="h-7 w-7 text-gold ml-1" fill="currentColor" strokeWidth={0} />
            </div>
            <p className="landing-video-thumb__label">Founder&apos;s note — coming soon</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WhyAurelius() {
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
          <SectionEyebrow>Why Aurelius</SectionEyebrow>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight">
            Three intelligence layers.{" "}
            <span className="gold-text italic">One private office.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl">
            Built for India&apos;s wealth creators — not retail investors. Every module is designed for confidentiality, citation, and counsel-grade reasoning.
          </p>
        </motion.div>

        <div className="landing-pillars-grid gap-4">
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
              <ul className="mt-auto space-y-2.5 text-sm text-muted-foreground">
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

type CompareLevel = "full" | "partial" | "none";

const comparisonRows: { capability: string; traditional: CompareLevel; wealthManager: CompareLevel; aurelius: CompareLevel }[] = [
  { capability: "Investment Tracking", traditional: "partial", wealthManager: "full", aurelius: "full" },
  { capability: "Document Vault", traditional: "none", wealthManager: "partial", aurelius: "full" },
  { capability: "Tax Intelligence", traditional: "none", wealthManager: "partial", aurelius: "full" },
  { capability: "Legal Intelligence", traditional: "none", wealthManager: "partial", aurelius: "full" },
  { capability: "Decision Memory", traditional: "none", wealthManager: "none", aurelius: "full" },
  { capability: "Expert Marketplace", traditional: "none", wealthManager: "none", aurelius: "full" },
  { capability: "Founder-Focused Planning", traditional: "none", wealthManager: "partial", aurelius: "full" },
  { capability: "AI Advisor", traditional: "partial", wealthManager: "none", aurelius: "full" },
  { capability: "Invite-Only Membership", traditional: "none", wealthManager: "partial", aurelius: "full" },
];

function CompareIndicator({ level, highlight }: { level: CompareLevel; highlight?: boolean }) {
  if (level === "full" && highlight) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold/12 border border-gold/25">
        <Check className="h-3.5 w-3.5 text-gold" strokeWidth={2} />
      </span>
    );
  }
  if (level === "full") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted/50 border border-border/50">
        <Check className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={2} />
      </span>
    );
  }
  if (level === "partial") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted/30 border border-border/40">
        <Minus className="h-3.5 w-3.5 text-muted-foreground/55" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center">
      <span className="h-1 w-1 rounded-full bg-muted-foreground/35" aria-hidden />
      <span className="sr-only">Not included</span>
    </span>
  );
}

function DifferentiationTable() {
  return (
    <section className="landing-section">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <motion.div {...fadeUp} className="max-w-2xl mb-10">
          <SectionEyebrow>Capability comparison</SectionEyebrow>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight">
            Built differently.{" "}
            <span className="text-muted-foreground italic">By design.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl">
            Aurelius is not a portfolio tracker. It is an intelligence office — unifying the capabilities principals typically assemble across separate tools and advisors.
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
          <p className="text-sm text-muted-foreground mb-3 md:hidden">Swipe to compare capabilities →</p>
          <div className="landing-compare-wrap scrollbar-none">
            <table className="landing-compare">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Traditional Investment Apps</th>
                  <th scope="col">Wealth Managers</th>
                  <th scope="col" className="landing-compare__aurelius">Aurelius</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.capability}>
                    <td>{row.capability}</td>
                    <td>
                      <CompareIndicator level={row.traditional} />
                    </td>
                    <td>
                      <CompareIndicator level={row.wealthManager} />
                    </td>
                    <td className="landing-compare__aurelius">
                      <CompareIndicator level={row.aurelius} highlight />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground/70 leading-relaxed max-w-3xl">
            Indicators reflect typical capability coverage by category — not a rating of any specific product or firm. Aurelius is positioned as a unified intelligence workspace for principals.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

const memberTestimonials = [
  {
    quote:
      "For the first time my CA, lawyer and wealth manager are all looking at the same picture.",
    attribution: "Founder, Mumbai",
    note: "Name withheld by request.",
  },
  {
    quote:
      "Finally a system that understands multi-entity wealth without noise. It feels private and intentional.",
    attribution: "Member, Family Office",
  },
  {
    quote:
      "The level of clarity in structuring and thinking is unlike anything I've seen in traditional advisory.",
    attribution: "Founder, Private Business Group",
  },
  {
    quote: "Aurelius feels less like a platform and more like a private wealth layer.",
    attribution: "Independent Investor",
  },
];

const TESTIMONIAL_INTERVAL_MS = 6500;

function MemberTestimonial() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const item = memberTestimonials[activeIndex];

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % memberTestimonials.length);
    }, TESTIMONIAL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <section className="landing-section">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <motion.div {...fadeUp} className="text-center mb-8 sm:mb-10">
          <SectionEyebrow>From our members</SectionEyebrow>
        </motion.div>
        <motion.div {...fadeUp} className="max-w-3xl mx-auto landing-testimonial-rotator">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeIndex}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="landing-testimonial-card px-8 py-12 sm:px-12 sm:py-14 lg:px-16 lg:py-16 text-center"
            >
              <blockquote className="font-display text-2xl sm:text-3xl lg:text-[2rem] leading-[1.35] tracking-tight text-balance text-foreground/95">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <footer className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gold/15">
                <cite className="not-italic text-sm text-muted-foreground leading-relaxed">
                  — {item.attribution}
                  {item.note && (
                    <span className="text-muted-foreground/80">. {item.note}</span>
                  )}
                </cite>
              </footer>
            </motion.div>
          </AnimatePresence>
          <div className="landing-testimonial-dots" aria-hidden>
            {memberTestimonials.map((_, i) => (
              <span
                key={memberTestimonials[i].attribution}
                className={`landing-testimonial-dots__dot ${i === activeIndex ? "landing-testimonial-dots__dot--active" : ""}`}
              />
            ))}
          </div>
        </motion.div>
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
              <SectionEyebrow className="mb-4">Security & privacy</SectionEyebrow>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-tight">
                Your wealth is private.{" "}
                <span className="text-muted-foreground italic">So is your data.</span>
              </h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Aurelius is architected like a custodian — not a consumer app. Documents are encrypted, sessions are gated, and membership is verified before a vault is ever provisioned.
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
                  <div className="text-sm text-muted-foreground mt-1.5 uppercase tracking-wider">{item.v}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

const faqItems = [
  {
    question: "Who is Aurelius for?",
    answer:
      "Aurelius is built for principals, founders, promoters, and family offices managing significant wealth across multiple entities, jurisdictions, and advisory structures.",
  },
  {
    question: "Is Aurelius a financial advisor or wealth manager?",
    answer:
      "No. Aurelius is not a financial advisory firm. It is a private wealth intelligence and coordination layer that unifies tax, legal, investment, and advisory ecosystems into a single system of truth.",
  },
  {
    question: "How is my data protected?",
    answer:
      "Data is encrypted using AES-256 at rest and TLS 1.3 in transit. Aurelius operates on a zero-knowledge architecture with strict access controls. Your data is never sold, shared, or used for advertising.",
  },
  {
    question: "Who has access to my information?",
    answer:
      "Only you and explicitly authorized advisors within your private workspace. Access is fully controlled, auditable, and revocable at any time.",
  },
  {
    question: "How does the membership process work?",
    answer:
      "Aurelius operates on an invite-style review process. Applications are evaluated based on complexity of wealth structure and intended use case.",
  },
  {
    question: "How long does approval take?",
    answer:
      "Typically between 24–72 hours depending on application depth and verification requirements.",
  },
  {
    question: "What happens after I am approved?",
    answer:
      "Approved members receive private onboarding access to their Aurelius workspace.",
  },
  {
    question: "Is there a free trial or public access?",
    answer:
      "No. Aurelius does not offer public access. A controlled demo experience is available for evaluation purposes only.",
  },
];

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="landing-section landing-faq-section">
      <div className="max-w-3xl mx-auto px-5 lg:px-8">
        <motion.div {...fadeUp} className="text-center mb-10 sm:mb-12">
          <SectionEyebrow>Frequently asked</SectionEyebrow>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-balance">
            Questions, <span className="gold-text italic">answered privately.</span>
          </h2>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.06 }} className="landing-faq">
          {faqItems.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.question} className={`landing-faq__item ${isOpen ? "landing-faq__item--open" : ""}`}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="landing-faq__trigger"
                  aria-expanded={isOpen}
                >
                  <span className="landing-faq__question font-display text-base sm:text-lg tracking-tight text-left">
                    {item.question}
                  </span>
                  <span className="landing-faq__icon" aria-hidden>
                    <ChevronDown className="h-4 w-4 text-gold" strokeWidth={2} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="landing-faq__answer"
                      >
                        {item.answer}
                      </motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
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
          <SectionEyebrow>How membership works</SectionEyebrow>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight">
            Curated access,{" "}
            <span className="gold-text italic">not open registration.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Aurelius Private is membership into a network — not a freemium product. Every step is designed to preserve discretion and trust.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.07 }}
              className="panel-elevated rounded-2xl p-5 lg:p-6 relative"
            >
              <span className="text-sm font-mono text-gold/70 tracking-widest">{item.step}</span>
              <div className="h-9 w-9 rounded-lg bg-gold/10 grid place-items-center my-4">
                <item.icon className="h-4 w-4 text-gold" strokeWidth={1.4} />
              </div>
              <h3 className="font-display text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
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
          <SectionEyebrow>Apply for access</SectionEyebrow>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-balance max-w-3xl mx-auto">
            Request membership to{" "}
            <span className="gold-text italic">Aurelius Private.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            We onboard principals, promoters, and family offices by invitation. Submit a confidential application — if your profile aligns, you will receive a personal access code by email.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/apply" className="btn-primary btn-pill h-12 px-8 mobile-btn-full sm:w-auto shadow-luxury">
              Apply for access
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/access" className="btn-secondary btn-pill h-12 px-8 mobile-btn-full sm:w-auto">
              I have an invitation
            </Link>
          </div>

          <p className="mt-6 text-sm text-muted-foreground/70 max-w-md mx-auto">
            Typical review window: 5–10 business days. All applications handled under strict confidentiality.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
