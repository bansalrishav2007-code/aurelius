import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  Crown,
  Globe,
  Handshake,
  Landmark,
  LineChart,
  Shield,
  TreePine,
  User,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  COMPARISON_ROWS,
  formatInr,
  MEMBERSHIP_TIERS,
  TIER_ORDER,
  TIER_SHORT_LABELS,
  tierProgressIndex,
  type TierId,
  type TierProfileIcon,
} from "@/lib/membership/tiers";

const PROFILE_ICONS: Record<TierProfileIcon, LucideIcon> = {
  briefcase: Briefcase,
  chart: LineChart,
  person: User,
  buildings: Building2,
  globe: Globe,
  family: Users,
  crown: Crown,
  shield: Shield,
  office: Landmark,
  tree: TreePine,
  generations: Users,
  handshake: Handshake,
};

type TierDetailModalProps = {
  tierId: TierId | null;
  onClose: () => void;
  onSelectTier?: (tierId: TierId) => void;
};

function TierModalContent({
  tierId,
  onClose,
  onSelectTier,
}: {
  tierId: TierId;
  onClose: () => void;
  onSelectTier?: (tierId: TierId) => void;
}) {
  const tier = MEMBERSHIP_TIERS[tierId];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const progressPct = (tierProgressIndex(tierId) / TIER_ORDER.length) * 100;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setScrollProgress(max > 0 ? el.scrollTop / max : 0);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setScrollProgress(0);
  }, [tierId]);

  return (
    <motion.div
      key={tierId}
      className="tier-modal-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="tier-modal-progress" style={{ width: `${progressPct}%` }} aria-hidden />

      <div
        className="tier-modal-scroll-indicator"
        style={{ transform: `scaleY(${Math.max(scrollProgress, 0.08)})` }}
        aria-hidden
      />

      <span className="tier-modal-watermark" aria-hidden>
        {tier.tierNumber}
      </span>

      <button type="button" onClick={onClose} className="tier-modal-back" aria-label="Back to tiers">
        ← Back to tiers
      </button>

      <button type="button" onClick={onClose} className="tier-modal-close" aria-label="Close tier details">
        <X className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <div ref={scrollRef} className="tier-modal-scroll" onScroll={handleScroll}>
        <header className="tier-modal-header">
          <span className="tier-modal-badge">{tier.badge}</span>
          <h2 id="tier-modal-title" className="tier-modal-title">
            {tier.name}
          </h2>
          <p className="tier-modal-tagline">{tier.tagline}</p>

          <div className="tier-modal-pricing">
            <div className="tier-modal-price-option tier-modal-price-option--monthly">
              <span className="tier-modal-price-label">Monthly</span>
              <span className="tier-modal-price-value">{formatInr(tier.monthlyPrice)}/month</span>
            </div>
            <div className="tier-modal-price-option tier-modal-price-option--recommended">
              <span className="tier-modal-recommended">RECOMMENDED</span>
              <span className="tier-modal-price-label">Annual</span>
              <span className="tier-modal-price-value tier-modal-price-value--gold">
                {formatInr(tier.annualPrice)}/year
              </span>
              <span className="tier-modal-price-save">Save {formatInr(tier.annualSavings)}</span>
            </div>
          </div>

          <div className="tier-modal-actions">
            <Link
              to="/waitlist"
              search={{ tier: tierId }}
              className="btn-primary btn-pill tier-modal-cta"
              onClick={onClose}
            >
              Apply for this tier
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <button
              type="button"
              className="btn-secondary btn-pill tier-modal-cta"
              onClick={() => {
                document.getElementById("tier-comparison")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Compare all tiers
            </button>
          </div>
        </header>

        <section className="tier-modal-section">
          <h3 className="tier-modal-section-title">Built for</h3>
          <div className="tier-modal-profiles">
            {tier.profiles.map((profile) => {
              const Icon = PROFILE_ICONS[profile.icon];
              return (
                <div key={profile.title} className="tier-modal-profile-card">
                  <div className="tier-modal-profile-icon">
                    <Icon className="h-4 w-4 text-gold" strokeWidth={1.4} />
                  </div>
                  <h4 className="tier-modal-profile-title">{profile.title}</h4>
                  <p className="tier-modal-profile-desc">{profile.description}</p>
                </div>
              );
            })}
          </div>

          <div className="tier-modal-stats">
            {tier.stats.map((stat) => (
              <div key={stat.label} className="tier-modal-stat">
                <p className="tier-modal-stat-value">{stat.value}</p>
                <p className="tier-modal-stat-label">{stat.label}</p>
              </div>
            ))}
          </div>

          {tier.highlight && (
            <div className="tier-modal-highlight">
              <h4 className="tier-modal-highlight-title">{tier.highlight.title}</h4>
              <p className="tier-modal-highlight-text">{tier.highlight.text}</p>
            </div>
          )}
        </section>

        <section className="tier-modal-section">
          <h3 className="tier-modal-section-title">{tier.includedHeading}</h3>
          <div className="tier-modal-features">
            {tier.featureGroups.map((group) => (
              <div key={group.title} className="tier-modal-feature-group">
                <h4 className="tier-modal-feature-group-title">{group.title}</h4>
                <ul className="tier-modal-feature-list">
                  {group.features.map((f) => (
                    <li key={f.text}>
                      <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" strokeWidth={2} />
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {tier.excluded.length > 0 && (
          <section className="tier-modal-section">
            <h3 className="tier-modal-section-title tier-modal-section-title--muted">Available in higher tiers</h3>
            <ul className="tier-modal-excluded-list">
              {tier.excluded.map((item) => (
                <li key={item.text}>
                  <X className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>
                    <strong>{item.text}</strong> — available in {item.availableIn}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="tier-comparison" className="tier-modal-section">
          <h3 className="tier-modal-section-title">Compare all tiers</h3>
          <div className="tier-modal-comparison-wrap">
            <table className="tier-modal-comparison">
              <thead>
                <tr>
                  <th>Feature</th>
                  {TIER_ORDER.map((id, index) => (
                    <th
                      key={id}
                      className={`${id === tierId ? "tier-modal-comparison--active" : "tier-modal-comparison--faded"}`}
                    >
                      <div className="tier-modal-comparison-head">
                        {index > 0 && <span className="tier-modal-comparison-arrow" aria-hidden>→</span>}
                        <button
                          type="button"
                          className="tier-modal-comparison-tier-btn"
                          onClick={() => onSelectTier?.(id)}
                        >
                          {TIER_SHORT_LABELS[id]}
                        </button>
                        {id === tierId && <span className="tier-modal-you-are-here">YOU ARE HERE</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td>
                    {TIER_ORDER.map((id) => (
                      <td
                        key={id}
                        className={`${id === tierId ? "tier-modal-comparison--active" : "tier-modal-comparison--faded"}`}
                      >
                        {row[id] ? (
                          <span className="tier-modal-dot" aria-label="Included" />
                        ) : (
                          <span className="tier-modal-dot tier-modal-dot--empty" aria-label="Not included" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="tier-modal-section">
          <h3 className="tier-modal-section-title">Pricing</h3>
          <div className="tier-modal-pricing-cards">
            <div className="tier-modal-pricing-card tier-modal-pricing-card--monthly">
              <p className="tier-modal-pricing-amount">{formatInr(tier.monthlyPrice)}</p>
              <p className="tier-modal-pricing-period">per month</p>
              <ul className="tier-modal-pricing-meta">
                <li>Billed monthly</li>
                <li>Cancel anytime</li>
              </ul>
              <Link
                to="/waitlist"
                search={{ tier: tierId, billing: "monthly" }}
                className="btn-secondary btn-sm btn-pill w-full justify-center mt-4"
                onClick={onClose}
              >
                Apply monthly
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="tier-modal-pricing-card tier-modal-pricing-card--recommended">
              <span className="tier-modal-recommended">RECOMMENDED</span>
              <p className="tier-modal-pricing-amount tier-modal-pricing-amount--gold">
                {formatInr(tier.annualPrice)}
              </p>
              <p className="tier-modal-pricing-period">per year</p>
              <ul className="tier-modal-pricing-meta">
                <li>Save {formatInr(tier.annualSavings)} vs monthly</li>
                <li>Billed annually</li>
              </ul>
              <Link
                to="/waitlist"
                search={{ tier: tierId, billing: "annual" }}
                className="btn-primary btn-sm btn-pill w-full justify-center mt-4"
                onClick={onClose}
              >
                Apply annually
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <p className="tier-modal-disclaimer">
            All applications reviewed confidentially. Pricing confirmed on membership approval.
          </p>
        </section>

        <section className="tier-modal-section tier-modal-section--last">
          <h3 className="tier-modal-section-title">Questions</h3>
          <div className="tier-modal-faqs">
            {tier.faqs.map((faq) => (
              <div key={faq.question} className="tier-modal-faq">
                <p className="tier-modal-faq-q">{faq.question}</p>
                <p className="tier-modal-faq-a">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="tier-modal-sticky-bar">
        <Link
          to="/waitlist"
          search={{ tier: tierId }}
          className="btn-primary btn-pill tier-modal-sticky-cta"
          onClick={onClose}
        >
          Apply for {tier.name}
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
    </motion.div>
  );
}

export function TierDetailModal({ tierId, onClose, onSelectTier }: TierDetailModalProps) {
  useEffect(() => {
    if (!tierId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = prev || "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [tierId, onClose]);

  return (
    <AnimatePresence>
      {tierId && (
        <>
          <motion.div
            key="tier-modal-backdrop"
            className="tier-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            onClick={onClose}
            aria-hidden
          />
          <div className="tier-modal-stage" role="dialog" aria-modal="true" aria-labelledby="tier-modal-title">
            <AnimatePresence mode="wait">
              <TierModalContent
                key={tierId}
                tierId={tierId}
                onClose={onClose}
                onSelectTier={onSelectTier}
              />
            </AnimatePresence>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
