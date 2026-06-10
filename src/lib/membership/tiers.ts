export type TierId = "private" | "premium" | "black" | "legacy";

export type TierProfileIcon =
  | "briefcase"
  | "chart"
  | "person"
  | "buildings"
  | "globe"
  | "family"
  | "crown"
  | "shield"
  | "office"
  | "tree"
  | "generations"
  | "handshake";

export type TierFeature = { text: string };

export type TierFeatureGroup = {
  title: string;
  features: TierFeature[];
};

export type TierProfile = {
  icon: TierProfileIcon;
  title: string;
  description: string;
};

export type TierStat = { value: string; label: string };

export type TierHighlight = { title: string; text: string };

export type TierExcluded = { text: string; availableIn: string };

export type TierFaq = { question: string; answer: string };

export type ComparisonRow = {
  feature: string;
  private: boolean;
  premium: boolean;
  black: boolean;
  legacy: boolean;
};

export type MembershipTierDetail = {
  id: TierId;
  tierNumber: string;
  badge: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  annualSavings: number;
  profiles: TierProfile[];
  stats: TierStat[];
  highlight: TierHighlight | null;
  includedHeading: string;
  featureGroups: TierFeatureGroup[];
  excluded: TierExcluded[];
  faqs: TierFaq[];
};

export type TierCardPreview = {
  id: TierId;
  number: string;
  name: string;
  tagline: string;
  pricePreview: string;
  /** @deprecated Use outcomes — kept for compatibility */
  features: string[];
  outcomes: string[];
  replacesMonthlyServices: number;
  badge: string | null;
  featured?: boolean;
};

export type TierQuizEntityAnswer = "1-2" | "3-5" | "6+";
export type TierQuizCrossBorderAnswer = "yes" | "no";
export type TierQuizFamilyOfficeAnswer = "yes" | "building" | "no";

export type TierQuizAnswers = {
  entities: TierQuizEntityAnswer;
  crossBorder: TierQuizCrossBorderAnswer;
  familyOffice: TierQuizFamilyOfficeAnswer;
};

export const TIER_ORDER: TierId[] = ["private", "premium", "black", "legacy"];

export const TIER_LABELS: Record<TierId, string> = {
  private: "Aurelius Private",
  premium: "Aurelius Premium",
  black: "Aurelius Black",
  legacy: "Aurelius Legacy",
};

export const TIER_SHORT_LABELS: Record<TierId, string> = {
  private: "Private",
  premium: "Premium",
  black: "Black",
  legacy: "Legacy",
};

export const TIER_CARD_PREVIEWS: TierCardPreview[] = [
  {
    id: "private",
    number: "01",
    name: "Aurelius Private",
    tagline: "Your first private intelligence office.",
    pricePreview: "From ₹4,999/month",
    features: [],
    outcomes: [
      "Know your net position across all entities, instantly",
      "Never miss a tax or compliance deadline again",
      "Book verified CAs and lawyers without losing context",
    ],
    replacesMonthlyServices: 28_000,
    badge: "Most Popular",
  },
  {
    id: "premium",
    number: "02",
    name: "Aurelius Premium",
    tagline: "When one advisor is not enough.",
    pricePreview: "From ₹9,999/month",
    features: [],
    outcomes: [
      "Surface conflicts between your CA, lawyer, and banker in real time",
      "Coordinate three advisors in one encrypted room",
      "Model cross-border and multi-entity decisions before you commit",
    ],
    replacesMonthlyServices: 95_000,
    badge: "Recommended for Founders",
  },
  {
    id: "black",
    number: "03",
    name: "Aurelius Black",
    tagline: "Your complete financial command centre. Nothing missed. Ever.",
    pricePreview: "From ₹19,999/month",
    features: [],
    outcomes: [
      "Operate with an always-on CFO that knows your complete picture",
      "Get proactive alerts before liquidity or compliance issues surface",
      "Run unlimited expert consultations without coordination overhead",
    ],
    replacesMonthlyServices: 2_50_000,
    badge: null,
  },
  {
    id: "legacy",
    number: "04",
    name: "Aurelius Legacy",
    tagline: "Built for wealth that outlasts the people who built it.",
    pricePreview: "From ₹49,999/month",
    features: [],
    outcomes: [
      "Govern multi-generational wealth from one private command centre",
      "Document succession principles before the next transition",
      "Assign a dedicated concierge who coordinates your entire office",
    ],
    replacesMonthlyServices: 5_00_000,
    badge: null,
  },
];

export function recommendTierFromQuiz(answers: TierQuizAnswers): TierId {
  const scores: Record<TierId, number> = { private: 0, premium: 0, black: 0, legacy: 0 };

  if (answers.entities === "1-2") {
    scores.private += 4;
    scores.premium += 1;
  } else if (answers.entities === "3-5") {
    scores.premium += 4;
    scores.black += 2;
    scores.private += 1;
  } else {
    scores.black += 4;
    scores.legacy += 3;
    scores.premium += 1;
  }

  if (answers.crossBorder === "yes") {
    scores.premium += 3;
    scores.black += 2;
    scores.legacy += 1;
  } else {
    scores.private += 2;
    scores.premium += 1;
  }

  if (answers.familyOffice === "yes") {
    scores.legacy += 5;
    scores.black += 2;
  } else if (answers.familyOffice === "building") {
    scores.premium += 3;
    scores.black += 3;
    scores.legacy += 1;
  } else {
    scores.private += 2;
    scores.premium += 1;
  }

  return TIER_ORDER.reduce((best, tier) => (scores[tier] > scores[best] ? tier : best), "private");
}

export function yearlyPriceFromMonthly(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 12 * 0.8);
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  { feature: "Net Worth Dashboard", private: true, premium: true, black: true, legacy: true },
  { feature: "AI Wealth Advisor", private: true, premium: true, black: true, legacy: true },
  { feature: "Document Vault", private: true, premium: true, black: true, legacy: true },
  { feature: "CA & Lawyer Marketplace", private: true, premium: true, black: true, legacy: true },
  { feature: "AI Boardroom", private: false, premium: true, black: true, legacy: true },
  { feature: "Three Way Secure Room", private: false, premium: true, black: true, legacy: true },
  { feature: "Conflict Detector", private: false, premium: true, black: true, legacy: true },
  { feature: "Life Forecast Engine", private: false, premium: true, black: true, legacy: true },
  { feature: "Personal CFO Mode", private: false, premium: false, black: true, legacy: true },
  { feature: "Unlimited Consultations", private: false, premium: false, black: true, legacy: true },
  { feature: "Concierge Service", private: false, premium: false, black: false, legacy: true },
  { feature: "Family Governance Suite", private: false, premium: false, black: false, legacy: true },
];

const PRIVATE_FEATURES: TierFeatureGroup[] = [
  {
    title: "WEALTH",
    features: [
      { text: "Net Worth Dashboard — complete picture of all assets" },
      { text: "Investment Tracker — stocks, mutual funds, gold, crypto, real estate" },
      { text: "Asset Allocation Analysis — understand your exposure" },
      { text: "Portfolio Health Score — AI graded 0 to 100" },
      { text: "Cash Flow Management — income vs expenses tracking" },
      { text: "Goal Planning — set and track financial goals" },
      { text: "FIRE Calculator — financial independence planning" },
      { text: "Retirement Planner — corpus and timeline calculator" },
      { text: "Monthly CFO Report — automated" },
      { text: "Quarterly Wealth Review — PDF downloads" },
    ],
  },
  {
    title: "LEGAL",
    features: [
      { text: "Legal Intelligence Feed — daily updates relevant to your profile" },
      { text: "Entity Structure Map — visualise all your companies and holdings" },
      { text: "Basic Estate Planning — will status and beneficiary tracking" },
      { text: "Compliance Calendar — never miss a legal deadline" },
    ],
  },
  {
    title: "TAX",
    features: [
      { text: "Tax Hub Dashboard — complete tax picture" },
      { text: "Capital Gains Tracker — all transactions and liability" },
      { text: "Tax Planning Module — 80C, 80D, HRA optimisation" },
      { text: "Tax Intelligence Feed — budget and policy updates" },
    ],
  },
  {
    title: "AI",
    features: [
      { text: "AI Wealth Advisor — chat with AI that knows your complete profile" },
      { text: "AI Insights Feed — 5 personalised insights daily" },
      { text: "Scenario Simulator — what if analysis for major decisions" },
      { text: "AI Document Analysis — upload any document, AI explains it" },
    ],
  },
  {
    title: "VAULT",
    features: [
      { text: "Document Vault — 10GB encrypted storage" },
      { text: "AES-256 encryption on all files" },
      { text: "Secure document sharing with professionals" },
    ],
  },
  {
    title: "PROFESSIONALS",
    features: [
      { text: "CA Marketplace — browse and book verified CAs" },
      { text: "Lawyer Marketplace — browse and book verified lawyers" },
      { text: "2 expert consultations included per month" },
      { text: "Video consultations inside platform" },
    ],
  },
  {
    title: "SUPPORT",
    features: [
      { text: "Email support — 24 hour response" },
      { text: "Help documentation" },
      { text: "Onboarding session — 30 minutes with Aurelius team" },
    ],
  },
];

export const MEMBERSHIP_TIERS: Record<TierId, MembershipTierDetail> = {
  private: {
    id: "private",
    tierNumber: "01",
    badge: "TIER 01",
    name: "Aurelius Private",
    tagline: "Your first private intelligence office.",
    monthlyPrice: 4999,
    annualPrice: 49999,
    annualSavings: 10000,
    profiles: [
      {
        icon: "briefcase",
        title: "The First-Time Wealth Structurer",
        description:
          "You have built serious wealth — stocks, property, business — but it sits in scattered accounts with no connected picture. You need clarity before complexity catches up.",
      },
      {
        icon: "chart",
        title: "The Self-Made Founder",
        description:
          "Your business is your wealth. You have a CA for tax and a lawyer for contracts but they have never spoken to each other. One wrong decision could cost crores.",
      },
      {
        icon: "person",
        title: "The HNI Professional",
        description:
          "Senior doctor, consultant, banker or executive. You earn well, invest regularly, but have no structure. No succession plan. No legal clarity. Aurelius Private fixes that.",
      },
    ],
    stats: [
      { value: "₹1Cr — ₹10Cr", label: "Typical net worth range" },
      { value: "2-4", label: "Asset types typically managed" },
      { value: "1-2", label: "Legal entities usually involved" },
    ],
    highlight: null,
    includedHeading: "Everything in Aurelius Private",
    featureGroups: PRIVATE_FEATURES,
    excluded: [
      { text: "AI Boardroom", availableIn: "Premium and above" },
      { text: "Three Way Secure Room", availableIn: "Premium and above" },
      { text: "Conflict Detector", availableIn: "Premium and above" },
      { text: "Life Forecast Engine", availableIn: "Premium and above" },
      { text: "Personal CFO Mode", availableIn: "Black and above" },
      { text: "Concierge service", availableIn: "Legacy only" },
      { text: "Unlimited consultations", availableIn: "Black and above" },
    ],
    faqs: [
      {
        question: "Can I upgrade to a higher tier later?",
        answer: "Yes. Members can upgrade at any time. Your data and history transfers automatically.",
      },
      {
        question: "Is there a free trial?",
        answer: "We offer a 14 day money back guarantee after onboarding.",
      },
      {
        question: "What payment methods are accepted?",
        answer: "UPI, Net Banking, Credit Card, Debit Card via Razorpay.",
      },
    ],
  },

  premium: {
    id: "premium",
    tierNumber: "02",
    badge: "TIER 02",
    name: "Aurelius Premium",
    tagline: "When one advisor is not enough.",
    monthlyPrice: 9999,
    annualPrice: 99999,
    annualSavings: 20000,
    profiles: [
      {
        icon: "buildings",
        title: "The Multi-Entity Business Family",
        description:
          "You own a Pvt Ltd, an LLP and a family trust. Your CA handles one. Your lawyer handles another. Your banker knows neither. The gaps between them cost you every quarter.",
      },
      {
        icon: "globe",
        title: "The NRI or Cross-Border Investor",
        description:
          "FEMA compliance. Overseas property. Foreign income. Each creates obligations across jurisdictions that no single advisor fully understands. Aurelius Premium connects all of them.",
      },
      {
        icon: "family",
        title: "The Second Generation Inheritor",
        description:
          "You inherited significant wealth but not the knowledge to protect it. Multiple assets, complex structures, ageing documents. Aurelius Premium gives you complete visibility and control.",
      },
    ],
    stats: [
      { value: "₹10Cr — ₹50Cr", label: "Typical net worth range" },
      { value: "3-7", label: "Asset types typically managed" },
      { value: "3-6", label: "Legal entities usually involved" },
    ],
    highlight: null,
    includedHeading: "Everything in Aurelius Premium",
    featureGroups: [
      {
        title: "WEALTH",
        features: [
          { text: "All Aurelius Private wealth intelligence — net worth, allocation, goals, FIRE, retirement" },
          { text: "Multi-entity structure mapping — unlimited entities and subsidiaries" },
          { text: "Cross-holding analysis — visualise promoter and family linkages" },
          { text: "Bi-weekly CFO Report — automated with executive summary" },
        ],
      },
      {
        title: "LEGAL",
        features: [
          { text: "Advanced estate planning — trust structures and succession mapping" },
          { text: "Regulatory watchlist — SEBI, RBI, FEMA updates tailored to your profile" },
          { text: "Three Way Secure Room — encrypted space for you, CA, and lawyer" },
        ],
      },
      {
        title: "TAX",
        features: [
          { text: "Transfer pricing alerts — cross-border and related-party exposure" },
          { text: "All Private tier tax intelligence — capital gains, 80C/80D, policy feed" },
        ],
      },
      {
        title: "AI",
        features: [
          { text: "AI Boardroom — multi-agent deliberation on major wealth decisions" },
          { text: "Life Forecast Engine — model long-range wealth and lifestyle scenarios" },
          { text: "Conflict Detector — surface contradictions across tax, legal, and investment advice" },
          { text: "AI Insights Feed — 15 personalised insights daily" },
        ],
      },
      {
        title: "VAULT",
        features: [
          { text: "Document Vault — 25GB encrypted storage" },
          { text: "AES-256 encryption and secure professional sharing" },
        ],
      },
      {
        title: "PROFESSIONALS",
        features: [
          { text: "4 expert consultations included per month" },
          { text: "Priority booking with top-rated CAs and lawyers" },
          { text: "Dedicated professional notes synced to your vault" },
        ],
      },
      {
        title: "SUPPORT",
        features: [
          { text: "Priority email support — 12 hour response" },
          { text: "Onboarding session — 60 minutes with Aurelius team" },
        ],
      },
    ],
    excluded: [
      { text: "Personal CFO Mode", availableIn: "Black and above" },
      { text: "Unlimited consultations", availableIn: "Black and above" },
      { text: "Dedicated relationship manager", availableIn: "Black and above" },
      { text: "Concierge service", availableIn: "Legacy only" },
      { text: "Family governance suite", availableIn: "Legacy only" },
    ],
    faqs: [
      {
        question: "How is Premium different from Private?",
        answer: "Premium adds multi-entity intelligence, AI Boardroom, secure three-way rooms, and deeper tax-legal coordination for complex structures.",
      },
      {
        question: "Can I upgrade to a higher tier later?",
        answer: "Yes. Members can upgrade at any time. Your data and history transfers automatically.",
      },
      {
        question: "What payment methods are accepted?",
        answer: "UPI, Net Banking, Credit Card, Debit Card via Razorpay.",
      },
    ],
  },

  black: {
    id: "black",
    tierNumber: "03",
    badge: "TIER 03 · MOST EXCLUSIVE",
    name: "Aurelius Black",
    tagline: "Your complete financial command centre. Nothing missed. Ever.",
    monthlyPrice: 19999,
    annualPrice: 199999,
    annualSavings: 40000,
    profiles: [
      {
        icon: "crown",
        title: "The Listed Company Promoter",
        description:
          "SEBI compliance. Insider trading boundaries. Promoter disclosures. One wrong move is public and permanent. Aurelius Black monitors every obligation in real time so you never have a compliance surprise.",
      },
      {
        icon: "shield",
        title: "The Ultra HNI Principal",
        description:
          "₹50 crore and above across multiple structures. You need the intelligence of a CFO, the advice of a top lawyer and the oversight of a private banker — without any of them knowing the complete picture. Aurelius Black gives you all three in one private room.",
      },
      {
        icon: "office",
        title: "The Family Office Principal",
        description:
          "You manage wealth for your entire family. Different generations. Different needs. Different risk appetites. Aurelius Black is the command centre that sees everything, coordinates everyone and protects everyone — simultaneously.",
      },
    ],
    stats: [
      { value: "₹50Cr+", label: "Typical net worth range" },
      { value: "7+", label: "Asset types managed" },
      { value: "6-15", label: "Legal entities typically involved" },
    ],
    highlight: {
      title: "What makes Black different",
      text: "Aurelius Black members get a Personal CFO Mode — an AI that operates as your always-on chief financial officer. It monitors every position, detects every conflict and prepares every briefing before you need it. No human CFO. No information leakage. Complete control.",
    },
    includedHeading: "Everything in Aurelius Black",
    featureGroups: [
      {
        title: "WEALTH",
        features: [
          { text: "All Premium tier wealth intelligence and multi-entity mapping" },
          { text: "Real-time portfolio health monitoring" },
          { text: "Weekly CFO Report — automated with executive commentary" },
          { text: "Capital allocation modelling — deploy, hold, or divest recommendations" },
        ],
      },
      {
        title: "LEGAL",
        features: [
          { text: "Full Premium legal intelligence and secure collaboration rooms" },
          { text: "Promoter compliance monitoring — SEBI disclosures and insider boundaries" },
        ],
      },
      {
        title: "TAX",
        features: [
          { text: "Full Premium tax intelligence with transfer pricing and cross-border alerts" },
          { text: "Proactive tax risk surfacing across all entities" },
        ],
      },
      {
        title: "AI",
        features: [
          { text: "Personal CFO Mode — AI operates as your always-on chief financial officer" },
          { text: "Proactive alerts — liquidity, compliance, and opportunity signals" },
          { text: "Board-ready reporting — executive packs for family and advisors" },
          { text: "Custom scenario libraries — save and replay major decisions" },
        ],
      },
      {
        title: "VAULT",
        features: [
          { text: "Document Vault — 100GB encrypted storage" },
          { text: "Audit trail on all document access and sharing" },
          { text: "Custom access policies for family members and advisors" },
        ],
      },
      {
        title: "PROFESSIONALS",
        features: [
          { text: "Unlimited expert consultations — CAs, lawyers, and specialists" },
          { text: "Dedicated relationship manager — single point of contact" },
          { text: "Same-day booking priority across the expert network" },
        ],
      },
      {
        title: "SUPPORT",
        features: [
          { text: "24/7 priority support — 4 hour response SLA" },
          { text: "Quarterly private office review with Aurelius team" },
          { text: "Direct line to product and advisory leadership" },
        ],
      },
    ],
    excluded: [
      { text: "Concierge service", availableIn: "Legacy only" },
      { text: "Multi-generational governance suite", availableIn: "Legacy only" },
      { text: "Family constitution builder", availableIn: "Legacy only" },
      { text: "Succession simulation engine", availableIn: "Legacy only" },
    ],
    faqs: [
      {
        question: "What is Personal CFO Mode?",
        answer: "An AI layer that continuously monitors your wealth, surfaces risks and opportunities, and prepares board-ready intelligence — like having a CFO on call around the clock.",
      },
      {
        question: "Can I upgrade to Legacy later?",
        answer: "Yes. Black members can upgrade to Legacy for multi-generational governance and concierge services.",
      },
      {
        question: "What payment methods are accepted?",
        answer: "UPI, Net Banking, Credit Card, Debit Card via Razorpay. Annual invoicing available on request.",
      },
    ],
  },

  legacy: {
    id: "legacy",
    tierNumber: "04",
    badge: "TIER 04 · GENERATIONAL",
    name: "Aurelius Legacy",
    tagline: "Built for wealth that outlasts the people who built it.",
    monthlyPrice: 49999,
    annualPrice: 499999,
    annualSavings: 100000,
    profiles: [
      {
        icon: "tree",
        title: "The Dynasty Builder",
        description:
          "You are not managing wealth for today. You are building structures that will protect your family for 100 years. Trusts, foundations, family constitutions. Aurelius Legacy is the intelligence layer that makes it all coherent and permanent.",
      },
      {
        icon: "generations",
        title: "The Multi-Generational Family Office",
        description:
          "Three generations. Fifteen family members. Seven entities across two countries. Each generation has different needs, different risk tolerance and different relationships with the family wealth. Aurelius Legacy manages all of it from one private room.",
      },
      {
        icon: "handshake",
        title: "The Legacy Protector",
        description:
          "You watched your parents build extraordinary wealth. You are determined not to be the generation that loses it. Aurelius Legacy gives you the structure, intelligence and professional network to protect every rupee across every generation.",
      },
    ],
    stats: [
      { value: "₹100Cr+", label: "Typical net worth range" },
      { value: "10+", label: "Asset types managed" },
      { value: "10-30", label: "Family members typically involved" },
    ],
    highlight: {
      title: "The Aurelius Concierge",
      text: "Every Aurelius Legacy member is assigned a dedicated Concierge — a real human from our private office team who knows your complete profile, coordinates your professionals and is available on WhatsApp from 9am to 9pm. This is the closest thing to having a private family office — at a fraction of the cost.",
    },
    includedHeading: "Everything in Aurelius Legacy",
    featureGroups: [
      {
        title: "WEALTH",
        features: [
          { text: "All Black tier wealth intelligence and Personal CFO Mode" },
          { text: "Multi-generational dashboard — per-member and per-generation views" },
          { text: "Dynasty wealth modelling — 25 to 100 year horizon planning" },
        ],
      },
      {
        title: "LEGAL",
        features: [
          { text: "Family constitution builder — document values and succession principles" },
          { text: "Family governance suite — policies, roles, and decision frameworks" },
          { text: "Succession simulation engine — model generational transitions" },
        ],
      },
      {
        title: "TAX",
        features: [
          { text: "Full Black tier tax intelligence across all family entities" },
          { text: "Cross-generational tax planning and trust optimisation" },
        ],
      },
      {
        title: "AI",
        features: [
          { text: "Personal CFO Mode extended to family office scope" },
          { text: "Generational scenario modelling and conflict detection" },
        ],
      },
      {
        title: "VAULT",
        features: [
          { text: "Unlimited encrypted vault storage" },
          { text: "Generational document archive — deeds, trusts, and family agreements" },
          { text: "Continuity planning — emergency access and succession protocols" },
        ],
      },
      {
        title: "PROFESSIONALS",
        features: [
          { text: "Unlimited consultations across all expert categories" },
          { text: "Curated advisory panel — hand-selected for your family office" },
          { text: "Annual strategy offsite — facilitated by Aurelius private office" },
        ],
      },
      {
        title: "SUPPORT",
        features: [
          { text: "Dedicated Concierge — WhatsApp 9am to 9pm, seven days" },
          { text: "Dedicated family office liaison — named relationship lead" },
          { text: "24/7 concierge support — 2 hour response SLA" },
        ],
      },
    ],
    excluded: [],
    faqs: [
      {
        question: "Is Legacy invite-only?",
        answer: "Legacy is available by application and private office review. We assess family complexity, governance needs, and advisory ecosystem before confirming membership.",
      },
      {
        question: "Can multiple family members access the workspace?",
        answer: "Yes. Legacy includes controlled multi-user access with role-based permissions for principals, next-generation members, and authorised advisors.",
      },
      {
        question: "What payment methods are accepted?",
        answer: "UPI, Net Banking, Credit Card, Debit Card via Razorpay. Annual invoicing and custom billing arrangements available.",
      },
    ],
  },
};

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatInrCompact(amount: number): string {
  if (amount >= 1_00_000) {
    const lakhs = amount / 1_00_000;
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)} lakh`;
  }
  return formatInr(amount);
}

export function tierProgressIndex(tierId: TierId): number {
  return TIER_ORDER.indexOf(tierId) + 1;
}
