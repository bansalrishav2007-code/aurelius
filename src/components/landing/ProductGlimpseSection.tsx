import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, GitBranch, Landmark, Sparkles } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

const callouts = [
  {
    id: "desk",
    icon: Sparkles,
    title: "Intelligence Desk",
    desc: "Counsel-grade answers on tax, FEMA, and succession — cited to Indian statute.",
    position: "landing-product-glimpse__callout--desk",
  },
  {
    id: "entities",
    icon: GitBranch,
    title: "Entity map",
    desc: "Holdings, trusts, and promoter stakes in one principal-level view.",
    position: "landing-product-glimpse__callout--entities",
  },
  {
    id: "citations",
    icon: Landmark,
    title: "Citation layer",
    desc: "Every briefing traceable to IT Act sections, SEBI circulars, and RBI guidance.",
    position: "landing-product-glimpse__callout--citations",
  },
] as const;

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="landing-section-eyebrow">{children}</p>;
}

function WorkspacePreview() {
  return (
    <div className="landing-product-glimpse__workspace" aria-hidden>
      <div className="landing-product-glimpse__chrome">
        <div className="landing-product-glimpse__chrome-dots">
          <span />
          <span />
          <span />
        </div>
        <span className="landing-product-glimpse__chrome-url">aurelius.ai / private-office</span>
        <span className="landing-product-glimpse__chrome-badge">Preview</span>
      </div>

      <div className="landing-product-glimpse__desk-header">
        <div>
          <p className="landing-product-glimpse__desk-greeting">Good afternoon, Principal</p>
          <p className="landing-product-glimpse__desk-sub">Family office command · Tier I</p>
        </div>
        <div className="landing-product-glimpse__desk-stats">
          <div>
            <p className="landing-product-glimpse__stat-label">Net position</p>
            <p className="landing-product-glimpse__stat-value">₹142 Cr</p>
          </div>
          <div>
            <p className="landing-product-glimpse__stat-label">Entities</p>
            <p className="landing-product-glimpse__stat-value">6</p>
          </div>
          <div>
            <p className="landing-product-glimpse__stat-label">Jurisdictions</p>
            <p className="landing-product-glimpse__stat-value">3</p>
          </div>
        </div>
      </div>

      <div className="landing-product-glimpse__panels">
        <div className="landing-product-glimpse__panel landing-product-glimpse__panel--ai">
          <p className="landing-product-glimpse__panel-label">Intelligence desk</p>
          <div className="landing-product-glimpse__chat">
            <p className="landing-product-glimpse__chat-q">
              Can a promoter restructure ESOP taxation before Q4 liquidity event?
            </p>
            <p className="landing-product-glimpse__chat-a">
              Per <span>§17(1)(vii)</span> and Finance Act 2024 amendments, deferral is viable if vesting
              milestones are documented before 15 Sep. FEMA Schedule I reporting may apply if foreign
              subsidiary participation exceeds 10%.
            </p>
          </div>
        </div>

        <div className="landing-product-glimpse__panel landing-product-glimpse__panel--entities">
          <p className="landing-product-glimpse__panel-label">Entity structure</p>
          <ul className="landing-product-glimpse__entity-tree">
            <li>
              <span className="landing-product-glimpse__entity-node landing-product-glimpse__entity-node--root">
                Meridian Holdings Pvt Ltd
              </span>
              <ul>
                <li>
                  <span className="landing-product-glimpse__entity-node">Family Trust · Mumbai</span>
                  <ul>
                    <li>
                      <span className="landing-product-glimpse__entity-node">Operating Co · NSE-listed</span>
                    </li>
                  </ul>
                </li>
                <li>
                  <span className="landing-product-glimpse__entity-node">Singapore HoldCo · FEMA</span>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>

      <div className="landing-product-glimpse__shimmer" />
    </div>
  );
}

export function ProductGlimpseSection() {
  return (
    <section className="landing-section">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <motion.div {...fadeUp} className="max-w-2xl mb-10 lg:mb-12">
          <SectionEyebrow>The private office</SectionEyebrow>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight">
            Your intelligence desk,{" "}
            <span className="gold-text italic">provisioned on day one.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl">
            A single workspace for principals — portfolio context, entity structures, and cited counsel
            in one discreet environment. Explore the demo or apply for membership.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.06 }}
          className="landing-product-glimpse"
        >
          <div className="landing-product-glimpse__stage">
            <div className="landing-product-glimpse__frame">
              <WorkspacePreview />
            </div>

            {callouts.map((item, i) => (
              <motion.div
                key={item.id}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: 0.12 + i * 0.06 }}
                className={`landing-product-glimpse__callout ${item.position}`}
              >
                <div className="landing-product-glimpse__callout-icon">
                  <item.icon className="h-3.5 w-3.5 text-gold" strokeWidth={1.4} />
                </div>
                <div>
                  <p className="landing-product-glimpse__callout-title">{item.title}</p>
                  <p className="landing-product-glimpse__callout-desc">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="landing-product-glimpse__callouts-mobile">
            {callouts.map((item) => (
              <div key={item.id} className="landing-product-glimpse__callout landing-product-glimpse__callout--mobile">
                <div className="landing-product-glimpse__callout-icon">
                  <item.icon className="h-3.5 w-3.5 text-gold" strokeWidth={1.4} />
                </div>
                <div>
                  <p className="landing-product-glimpse__callout-title">{item.title}</p>
                  <p className="landing-product-glimpse__callout-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.2 }}
          className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4"
        >
          <Link to="/waitlist" className="btn-primary btn-pill h-12 px-7 shadow-luxury group mobile-btn-full sm:w-auto inline-flex items-center justify-center gap-2">
            Apply for access
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
          <Link
            to="/demo"
            className="btn-secondary btn-pill h-12 px-7 mobile-btn-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            Explore demo workspace
            <ArrowUpRight className="h-4 w-4 opacity-60" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
