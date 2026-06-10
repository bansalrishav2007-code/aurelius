import { formatInr } from "./calculations";
import {
  CESS_RATE,
  LIMIT_80C,
  LIMIT_80CCD1B,
  LIMIT_80D,
  LIMIT_80D_SENIOR,
  LIMIT_HOME_LOAN,
  LTCG_EXEMPTION,
  type TaxCalculatorInput,
  type TaxCalculatorResult,
} from "./tax-calculator";

export type ActionPriority = "high" | "medium" | "low";
export type ActionCategory =
  | "80C"
  | "80D"
  | "NPS"
  | "SGB"
  | "HUF"
  | "Structure"
  | "Capital Gains"
  | "Business"
  | "Regime";

export type ActionTimeline = "immediate" | "this_fy" | "next_year";

export type TaxActionItem = {
  id: string;
  priority: ActionPriority;
  category: ActionCategory;
  title: string;
  currentStatus: string;
  recommendation: string;
  taxSaved: number;
  section: string;
  timeline: ActionTimeline;
  askAiPrompt: string;
  goalTitle: string;
};

export type TaxActionPlan = {
  currentTax: number;
  identifiedSavings: number;
  maxSave: number;
  actions: TaxActionItem[];
  timeline: {
    immediate: TaxActionItem[];
    thisFy: TaxActionItem[];
    nextYear: TaxActionItem[];
  };
  daysToFyEnd: number;
};

function marginalRate(taxableIncome: number): number {
  if (taxableIncome > 1_000_000) return 0.3;
  if (taxableIncome > 500_000) return 0.2;
  if (taxableIncome > 250_000) return 0.05;
  return 0;
}

function taxSavedFromDeduction(amount: number, taxableIncome: number): number {
  if (amount <= 0) return 0;
  return Math.round(amount * marginalRate(taxableIncome) * (1 + CESS_RATE));
}

function daysUntilFyEnd(): number {
  const end = new Date("2026-03-31T23:59:59");
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
}

function pushAction(actions: TaxActionItem[], item: TaxActionItem) {
  if (item.taxSaved > 0 || item.priority === "high") actions.push(item);
}

export function buildTaxActionPlan(input: TaxCalculatorInput, result: TaxCalculatorResult): TaxActionPlan {
  const winning = result.winningRegime === "old" ? result.old : result.new;
  const currentTax = Math.round(winning.totalTax);
  const taxable = result.old.taxableIncome;
  const actions: TaxActionItem[] = [];

  const used80C = Math.min(input.deduction80C + (input.extra80C ?? 0), LIMIT_80C);
  const headroom80C = LIMIT_80C - used80C;
  if (headroom80C > 0) {
    const saved = taxSavedFromDeduction(headroom80C, taxable);
    pushAction(actions, {
      id: "max-80c",
      priority: headroom80C >= 50_000 ? "high" : "medium",
      category: "80C",
      title: "Maximise your 80C limit",
      currentStatus: `Used ${formatInr(used80C)} of ${formatInr(LIMIT_80C)}`,
      recommendation:
        "Top up ELSS, PPF, LIC premium, EPF voluntary contribution, NSC, or 5-year FD before 31 March. Tuition fees also qualify.",
      taxSaved: saved,
      section: "Section 80C",
      timeline: "immediate",
      askAiPrompt: `I have ${formatInr(headroom80C)} unused 80C headroom. Which instruments — ELSS, PPF, or LIC — should I prioritise for my profile?`,
      goalTitle: `Invest ${formatInr(Math.min(headroom80C, 50_000))} in 80C instruments`,
    });
  }

  const limit80D = input.isSenior ? LIMIT_80D_SENIOR : LIMIT_80D;
  const used80D = Math.min(input.deduction80D + (input.extra80D ?? 0), limit80D);
  const headroom80D = limit80D - used80D;
  if (headroom80D > 0) {
    pushAction(actions, {
      id: "max-80d",
      priority: "medium",
      category: "80D",
      title: "Increase health insurance cover",
      currentStatus: `Used ${formatInr(used80D)} of ${formatInr(limit80D)}`,
      recommendation:
        "Premium for self, spouse, children, or parents (extra benefit if parents are senior citizens) qualifies under 80D.",
      taxSaved: taxSavedFromDeduction(headroom80D, taxable),
      section: "Section 80D",
      timeline: "this_fy",
      askAiPrompt: `How much additional 80D benefit can I claim if I insure my parents? Current usage: ${formatInr(used80D)}.`,
      goalTitle: "Optimise 80D health insurance",
    });
  }

  const usedNps = Math.min(input.deduction80CCD1B + (input.extraNPS ?? 0), LIMIT_80CCD1B);
  const headroomNps = LIMIT_80CCD1B - usedNps;
  if (headroomNps > 0) {
    pushAction(actions, {
      id: "nps-80ccd1b",
      priority: "high",
      category: "NPS",
      title: "Use additional NPS deduction",
      currentStatus: `Used ${formatInr(usedNps)} of ${formatInr(LIMIT_80CCD1B)} under 80CCD(1B)`,
      recommendation:
        "NPS Tier 1 allows an extra ₹50,000 deduction beyond 80C — this is exclusive and highly efficient for high earners.",
      taxSaved: taxSavedFromDeduction(headroomNps, taxable),
      section: "Section 80CCD(1B)",
      timeline: "immediate",
      askAiPrompt: `Should I contribute ${formatInr(headroomNps)} more to NPS Tier 1 under 80CCD(1B) given my tax bracket?`,
      goalTitle: `Contribute ${formatInr(Math.min(headroomNps, 25_000))} to NPS`,
    });
  }

  const usedHome = Math.min(input.homeLoanInterest, LIMIT_HOME_LOAN);
  const headroomHome = LIMIT_HOME_LOAN - usedHome;
  if (headroomHome > 0 && input.homeLoanInterest >= 0) {
    pushAction(actions, {
      id: "home-loan-24b",
      priority: "medium",
      category: "Structure",
      title: "Claim home loan interest fully",
      currentStatus: `Claimed ${formatInr(usedHome)} of ${formatInr(LIMIT_HOME_LOAN)} under 24(b)`,
      recommendation: "Ensure interest certificate from lender is filed — self-occupied property interest up to ₹2L is deductible.",
      taxSaved: taxSavedFromDeduction(headroomHome, taxable),
      section: "Section 24(b)",
      timeline: "this_fy",
      askAiPrompt: "Review my home loan interest deduction under Section 24(b) — am I claiming the maximum?",
      goalTitle: "Verify home loan interest certificate",
    });
  }

  if (input.ltcg > LTCG_EXEMPTION) {
    const taxableLtcg = input.ltcg - LTCG_EXEMPTION;
    pushAction(actions, {
      id: "ltcg-harvest",
      priority: "high",
      category: "Capital Gains",
      title: "Plan LTCG harvesting",
      currentStatus: `LTCG ${formatInr(input.ltcg)} — ${formatInr(taxableLtcg)} taxable after ₹1.25L exemption`,
      recommendation:
        "Book losses to offset gains, consider 54EC bonds (REC/NHAI), or 54F reinvestment in residential property before year-end.",
      taxSaved: Math.round(taxableLtcg * 0.125 * 0.15),
      section: "Section 112A / 54EC / 54F",
      timeline: "immediate",
      askAiPrompt: `I have ${formatInr(input.ltcg)} LTCG. Walk me through harvesting, 54EC bonds, and 54F options.`,
      goalTitle: "LTCG tax optimisation review",
    });
  }

  if (result.winningRegime === "old" && result.savings > 5_000 && result.old.totalDeductions > 150_000) {
    pushAction(actions, {
      id: "stay-old-regime",
      priority: "high",
      category: "Regime",
      title: "Stay on the old tax regime",
      currentStatus: `Deductions ${formatInr(result.old.totalDeductions)} exceed new-regime break-even`,
      recommendation: "File under the old regime this year — switching to new regime would cost more given your deduction profile.",
      taxSaved: Math.round(result.savings),
      section: "Section 115BAC",
      timeline: "immediate",
      askAiPrompt: "Confirm whether I should file under the old regime this year given my deductions.",
      goalTitle: "Confirm tax regime selection",
    });
  }

  if (result.winningRegime === "new" && result.savings > 5_000) {
    pushAction(actions, {
      id: "use-new-regime",
      priority: "high",
      category: "Regime",
      title: "Default to the new tax regime",
      currentStatus: "New regime yields lower liability with your current profile",
      recommendation: "Opt for the new regime at filing — fewer deductions needed and lower effective rate.",
      taxSaved: Math.round(result.savings),
      section: "Section 115BAC",
      timeline: "immediate",
      askAiPrompt: "Should I default to the new tax regime for FY 2025-26 based on my income mix?",
      goalTitle: "Confirm new regime election",
    });
  }

  if (result.totalGrossIncome >= 1_00_00_000) {
    pushAction(actions, {
      id: "huf-structure",
      priority: "medium",
      category: "HUF",
      title: "Evaluate HUF or family structure",
      currentStatus: `Income ${formatInr(result.totalGrossIncome)} — in surcharge territory`,
      recommendation:
        "HUF creation can split income with family members in lower slabs. Consider gifting to spouse/parents in lower brackets with CA guidance.",
      taxSaved: Math.round(result.totalGrossIncome * 0.02 * 0.3),
      section: "HUF / Family gifting",
      timeline: "next_year",
      askAiPrompt: "At my income level, would an HUF or family trust structure reduce my tax burden legally?",
      goalTitle: "Explore HUF / family tax structure",
    });
  }

  if (result.totalGrossIncome >= 1_00_00_000) {
    pushAction(actions, {
      id: "llp-structure",
      priority: "low",
      category: "Structure",
      title: "Review LLP or company structure",
      currentStatus: "Income above ₹1 Cr — corporate structure may help business owners",
      recommendation: "If you have business income, legitimate expenses, depreciation, and home office claims can reduce taxable profits.",
      taxSaved: Math.round(50_000),
      section: "Business structure",
      timeline: "next_year",
      askAiPrompt: "Would converting part of my business income to an LLP reduce my overall tax?",
      goalTitle: "Business structure review with CA",
    });
  }

  if (input.salaryBusiness > 20_00_000) {
    pushAction(actions, {
      id: "business-expenses",
      priority: "medium",
      category: "Business",
      title: "Maximise legitimate business deductions",
      currentStatus: `Business / salary income ${formatInr(input.salaryBusiness)}`,
      recommendation:
        "Document professional expenses, depreciation on assets, and home office costs. Ensure books support every claim.",
      taxSaved: Math.round(1_00_000 * marginalRate(taxable) * (1 + CESS_RATE)),
      section: "Business income",
      timeline: "this_fy",
      askAiPrompt: "What legitimate business expenses and depreciation should I claim for my professional income?",
      goalTitle: "Document business expense claims",
    });
  }

  pushAction(actions, {
    id: "sgb-gold",
    priority: "low",
    category: "SGB",
    title: "Prefer SGB over physical gold",
    currentStatus: "Gold held in portfolio or planned purchases",
    recommendation: "Sovereign Gold Bonds offer 2.5% interest, tax-free maturity after 8 years, and no wealth tax on digital gold.",
    taxSaved: 15_000,
    section: "SGB Scheme",
    timeline: "this_fy",
    askAiPrompt: "Should I shift part of my gold allocation to Sovereign Gold Bonds for tax efficiency?",
    goalTitle: "Review SGB allocation",
  });

  const priorityOrder: Record<ActionPriority, number> = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const identifiedSavings = actions.reduce((sum, a) => sum + a.taxSaved, 0);

  return {
    currentTax,
    identifiedSavings,
    maxSave: identifiedSavings,
    actions,
    timeline: {
      immediate: actions.filter((a) => a.timeline === "immediate"),
      thisFy: actions.filter((a) => a.timeline === "this_fy"),
      nextYear: actions.filter((a) => a.timeline === "next_year"),
    },
    daysToFyEnd: daysUntilFyEnd(),
  };
}

export function planShareMessage(plan: TaxActionPlan, fy: string): string {
  return [
    `Please review my ${fy} Tax Saving Action Plan from Aurelius.`,
    `Current estimated tax: ${formatInr(plan.currentTax)}.`,
    `Identified legal savings: up to ${formatInr(plan.maxSave)} across ${plan.actions.length} recommendations.`,
    "Kindly confirm which actions I should implement before 31 March.",
  ].join(" ");
}
