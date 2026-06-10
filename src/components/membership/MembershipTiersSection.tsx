import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  formatInr,
  formatInrCompact,
  MEMBERSHIP_TIERS,
  recommendTierFromQuiz,
  TIER_CARD_PREVIEWS,
  yearlyPriceFromMonthly,
  type TierId,
  type TierQuizAnswers,
  type TierQuizCrossBorderAnswer,
  type TierQuizEntityAnswer,
  type TierQuizFamilyOfficeAnswer,
} from "@/lib/membership/tiers";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

const QUIZ_STEPS = [
  {
    key: "entities" as const,
    question: "How many entities do you manage?",
    options: [
      { value: "1-2" as TierQuizEntityAnswer, label: "1–2 entities" },
      { value: "3-5" as TierQuizEntityAnswer, label: "3–5 entities" },
      { value: "6+" as TierQuizEntityAnswer, label: "6+ entities" },
    ],
  },
  {
    key: "crossBorder" as const,
    question: "Do you have cross-border exposure?",
    options: [
      { value: "no" as TierQuizCrossBorderAnswer, label: "No" },
      { value: "yes" as TierQuizCrossBorderAnswer, label: "Yes" },
    ],
  },
  {
    key: "familyOffice" as const,
    question: "Do you have a family office?",
    options: [
      { value: "no" as TierQuizFamilyOfficeAnswer, label: "No" },
      { value: "building" as TierQuizFamilyOfficeAnswer, label: "Building one" },
      { value: "yes" as TierQuizFamilyOfficeAnswer, label: "Yes" },
    ],
  },
];

type BillingCycle = "monthly" | "yearly";

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="landing-section-eyebrow">{children}</p>;
}

export function MembershipTiersSection() {
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Partial<TierQuizAnswers>>({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [expandedTier, setExpandedTier] = useState<TierId | null>(null);

  const recommendedTier = useMemo(() => {
    if (!quizComplete || !quizAnswers.entities || !quizAnswers.crossBorder || !quizAnswers.familyOffice) {
      return null;
    }
    return recommendTierFromQuiz(quizAnswers as TierQuizAnswers);
  }, [quizComplete, quizAnswers]);

  function handleQuizAnswer<K extends keyof TierQuizAnswers>(key: K, value: TierQuizAnswers[K]) {
    const next = { ...quizAnswers, [key]: value };
    setQuizAnswers(next);

    if (quizStep < QUIZ_STEPS.length - 1) {
      setQuizStep((s) => s + 1);
      return;
    }

    setQuizComplete(true);
  }

  function resetQuiz() {
    setQuizStep(0);
    setQuizAnswers({});
    setQuizComplete(false);
    setExpandedTier(null);
  }

  const currentStep = QUIZ_STEPS[quizStep];

  return (
    <section className="landing-section">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <SectionEyebrow>Membership tiers</SectionEyebrow>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight text-balance">
            One platform.{" "}
            <span className="text-muted-foreground italic">Four levels of access.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Answer three questions to see your recommended tier — then compare outcomes, not feature lists.
          </p>
        </motion.div>

        {!quizComplete ? (
          <motion.div {...fadeUp} className="membership-tier-quiz max-w-xl mx-auto">
            <div className="membership-tier-quiz__progress" aria-hidden>
              {QUIZ_STEPS.map((step, index) => (
                <span
                  key={step.key}
                  className={`membership-tier-quiz__dot ${
                    index < quizStep ? "membership-tier-quiz__dot--done" : index === quizStep ? "membership-tier-quiz__dot--active" : ""
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.key}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="membership-tier-quiz__card panel-elevated rounded-3xl p-6 sm:p-8 shadow-luxury"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-gold/80 mb-3">
                  Question {quizStep + 1} of {QUIZ_STEPS.length}
                </p>
                <h3 className="font-display text-2xl sm:text-3xl tracking-tight text-balance">{currentStep.question}</h3>
                <div className="mt-6 grid gap-2.5">
                  {currentStep.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="membership-tier-quiz__option"
                      onClick={() => handleQuizAnswer(currentStep.key, option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {quizStep > 0 && (
                  <button type="button" className="membership-tier-quiz__back" onClick={() => setQuizStep((s) => s - 1)}>
                    ← Previous question
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            {recommendedTier && (
              <p className="membership-tier-quiz__result text-center text-sm text-muted-foreground mb-8">
                Based on your answers, we recommend{" "}
                <span className="text-gold font-medium">{MEMBERSHIP_TIERS[recommendedTier].name}</span>.{" "}
                <button type="button" className="membership-tier-quiz__retake" onClick={resetQuiz}>
                  Retake quiz
                </button>
              </p>
            )}

            <div className="membership-billing-toggle" role="group" aria-label="Billing cycle">
              <button
                type="button"
                className={`membership-billing-toggle__btn ${billingCycle === "monthly" ? "membership-billing-toggle__btn--active" : ""}`}
                onClick={() => setBillingCycle("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`membership-billing-toggle__btn ${billingCycle === "yearly" ? "membership-billing-toggle__btn--active" : ""}`}
                onClick={() => setBillingCycle("yearly")}
              >
                Yearly
                <span className="membership-billing-toggle__save">Save 20%</span>
              </button>
            </div>

            <div className="landing-tiers-grid gap-4 sm:gap-5 mt-8">
              {TIER_CARD_PREVIEWS.map((tier, i) => {
                const detail = MEMBERSHIP_TIERS[tier.id];
                const isRecommended = recommendedTier === tier.id;
                const isExpanded = expandedTier === tier.id;
                const displayPrice =
                  billingCycle === "monthly"
                    ? `${formatInr(detail.monthlyPrice)}/month`
                    : `${formatInr(yearlyPriceFromMonthly(detail.monthlyPrice))}/year`;

                return (
                  <motion.div
                    key={tier.id}
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: i * 0.07 }}
                    className={`landing-tier-card landing-tier-card--interactive flex flex-col h-full ${
                      isRecommended ? "landing-tier-card--recommended" : ""
                    } ${tier.badge === "Most Popular" ? "landing-tier-card--popular" : ""}`}
                  >
                    <span className="landing-tier-card__number">{tier.number}</span>
                    {tier.badge && <span className="landing-tier-card__badge">{tier.badge}</span>}
                    {isRecommended && <span className="landing-tier-card__match">Best match for you</span>}

                    <h3 className="font-display text-xl sm:text-2xl tracking-tight text-foreground">{tier.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{tier.tagline}</p>

                    <p className="landing-tier-card__price landing-tier-card__price--large">{displayPrice}</p>
                    <p className="landing-tier-card__replaces">
                      Replaces {formatInrCompact(tier.replacesMonthlyServices)}/month in separate services
                    </p>

                    <ul className="landing-tier-card__features landing-tier-card__features--outcomes">
                      {tier.outcomes.map((outcome) => (
                        <li key={outcome}>{outcome}</li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="landing-tier-card__expand-trigger"
                      onClick={() => setExpandedTier(isExpanded ? null : tier.id)}
                      aria-expanded={isExpanded}
                    >
                      View full details
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="landing-tier-card__expand-panel overflow-hidden"
                        >
                          <div className="landing-tier-card__expand-inner">
                            {detail.featureGroups.map((group) => (
                              <div key={group.title} className="landing-tier-card__feature-group">
                                <h4 className="landing-tier-card__feature-group-title">{group.title}</h4>
                                <ul>
                                  {group.features.map((feature) => (
                                    <li key={feature.text}>
                                      <Check className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" strokeWidth={2} />
                                      <span>{feature.text}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Link
                      to="/waitlist"
                      search={{ tier: tier.id, billing: billingCycle === "yearly" ? "annual" : "monthly" }}
                      className="btn-primary btn-pill landing-tier-card__apply mt-auto"
                    >
                      Apply for {tier.name}
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <p className="membership-comparison-line">
              A CA + lawyer + wealth manager costs ₹2–5 lakh/month. Aurelius starts at ₹4,999.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
