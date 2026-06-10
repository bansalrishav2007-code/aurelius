export const AI_ADVISOR_SUGGESTED_QUESTIONS = [
  "How can I save more tax this year?",
  "Is my portfolio properly balanced?",
  "What should I do with my idle cash?",
  "Review my wealth structure",
] as const;

/** @deprecated use AI_ADVISOR_SUGGESTED_QUESTIONS */
export const AI_ADVISOR_QUICK_STARTERS = AI_ADVISOR_SUGGESTED_QUESTIONS;

export const AI_ADVISOR_STARTERS = [
  {
    category: "Wealth planning",
    prompt: "How should I structure my portfolio across equity, real estate, and fixed income for the next 5 years?",
  },
  {
    category: "Investments",
    prompt: "What are the tax implications of selling long-term listed equity this financial year?",
  },
  {
    category: "Retirement",
    prompt: "Help me build a retirement corpus plan assuming I want ₹10 crore in today's terms by age 55.",
  },
  {
    category: "Business",
    prompt: "What should I consider before restructuring promoter shareholding ahead of a strategic sale?",
  },
  {
    category: "Personal finance",
    prompt: "How can I optimise advance tax and TDS for a high-income salaried + capital gains profile?",
  },
  {
    category: "Compliance",
    prompt: "What are my FEMA and foreign asset disclosure obligations as an Indian resident?",
  },
] as const;
