import { formatInr } from "./calculations";
import {
  CESS_RATE,
  computeTax,
  LIMIT_80C,
  LIMIT_80CCD1B,
  LIMIT_80D,
  LIMIT_80D_SENIOR,
  LIMIT_HOME_LOAN,
  LTCG_EXEMPTION,
  LTCG_RATE,
  type TaxCalculatorInput,
  type TaxCalculatorResult,
} from "./tax-calculator";

export type DeductionSectionId =
  | "80c"
  | "80d"
  | "80ccd1b"
  | "24b"
  | "hra"
  | "54ec"
  | "sgb";

export type DeductionSection = {
  id: DeductionSectionId;
  title: string;
  subtitle?: string;
  used: number;
  limit: number | null;
  remaining: number;
  taxSavingIfClaimed: number;
  fullyClaimed: boolean;
  howToClaim: string[];
  actionLabel: string;
  actionType: "claim" | "calculate" | "learn";
  applicable: boolean;
};

export type ChecklistItem = {
  id: string;
  sectionId: DeductionSectionId;
  label: string;
  detail: string;
  deadline: string;
  amount?: number;
};

export type WealthPrefillSuggestion = {
  name: string;
  category: "equity" | "cash_fd" | "gold" | "other";
  value: number;
  notes?: string;
};

export type DeductionMaximiserResult = {
  sections: DeductionSection[];
  summary: {
    currentDeductions: number;
    maximumPossible: number;
    gap: number;
    currentTax: number;
    minimumPossibleTax: number;
    totalTaxSaving: number;
    leftOnTable: number;
    progressPercent: number;
    claimedCount: number;
    applicableCount: number;
  };
  regimeAfterMax: {
    oldTax: number;
    newTax: number;
    winningRegime: "old" | "new";
    savings: number;
    message: string;
  };
  checklist: ChecklistItem[];
  wealthPrefills: WealthPrefillSuggestion[];
  expertAgenda: string;
};

function clamp(value: number, max: number) {
  return Math.min(Math.max(0, value), max);
}

function marginalRateOld(taxableIncome: number): number {
  if (taxableIncome > 1_000_000) return 0.3;
  if (taxableIncome > 500_000) return 0.2;
  if (taxableIncome > 250_000) return 0.05;
  return 0;
}

function taxSavedOnDeduction(amount: number, taxableIncome: number): number {
  if (amount <= 0) return 0;
  return Math.round(amount * marginalRateOld(taxableIncome) * (1 + CESS_RATE));
}

function estimateHraPotential(salary: number): number {
  if (salary <= 0) return 0;
  const metroCap = salary * 0.5;
  const assumedRent = salary * 0.25;
  const rentMinus10 = Math.max(0, assumedRent - salary * 0.1);
  return Math.round(Math.min(metroCap, rentMinus10, salary * 0.4));
}

export function applyMaxDeductions(input: TaxCalculatorInput): TaxCalculatorInput {
  const limit80D = input.isSenior ? LIMIT_80D_SENIOR : LIMIT_80D;
  const hra =
    input.hraExemption > 0
      ? input.hraExemption
      : estimateHraPotential(input.salaryBusiness);

  return {
    ...input,
    deduction80C: LIMIT_80C,
    deduction80D: limit80D,
    deduction80CCD1B: LIMIT_80CCD1B,
    homeLoanInterest: LIMIT_HOME_LOAN,
    hraExemption: hra,
    extra80C: 0,
    extra80D: 0,
    extraNPS: 0,
  };
}

export function buildDeductionMaximiser(
  input: TaxCalculatorInput,
  result: TaxCalculatorResult,
): DeductionMaximiserResult {
  const limit80D = input.isSenior ? LIMIT_80D_SENIOR : LIMIT_80D;
  const used80C = clamp(input.deduction80C + (input.extra80C ?? 0), LIMIT_80C);
  const used80D = clamp(input.deduction80D + (input.extra80D ?? 0), limit80D);
  const usedNps = clamp(input.deduction80CCD1B + (input.extraNPS ?? 0), LIMIT_80CCD1B);
  const usedHome = clamp(input.homeLoanInterest, LIMIT_HOME_LOAN);
  const usedHra = Math.max(0, input.hraExemption);
  const taxable = result.old.taxableIncome;

  const sections: DeductionSection[] = [
    {
      id: "80c",
      title: "Section 80C",
      used: used80C,
      limit: LIMIT_80C,
      remaining: LIMIT_80C - used80C,
      taxSavingIfClaimed: taxSavedOnDeduction(LIMIT_80C - used80C, taxable),
      fullyClaimed: used80C >= LIMIT_80C,
      howToClaim: [
        "ELSS Mutual Fund — most flexible, 3 year lock-in",
        "PPF — safest, 15 year, tax free returns",
        "LIC premium — if you have a policy",
        "EPF voluntary top-up",
      ],
      actionLabel: "Claim this deduction →",
      actionType: "claim",
      applicable: true,
    },
    {
      id: "80d",
      title: "Section 80D — Health Insurance",
      used: used80D,
      limit: limit80D,
      remaining: limit80D - used80D,
      taxSavingIfClaimed: taxSavedOnDeduction(limit80D - used80D, taxable),
      fullyClaimed: used80D >= limit80D,
      howToClaim: [
        "Buy health insurance for self/family",
        `₹${(LIMIT_80D / 1000).toFixed(0)}K limit for self + family`,
        "₹50,000 if parents are senior citizens",
        "Extra ₹25,000 for parents' insurance",
      ],
      actionLabel: "Claim this deduction →",
      actionType: "claim",
      applicable: true,
    },
    {
      id: "80ccd1b",
      title: "Section 80CCD(1B) — NPS",
      subtitle: "Available in New Regime too",
      used: usedNps,
      limit: LIMIT_80CCD1B,
      remaining: LIMIT_80CCD1B - usedNps,
      taxSavingIfClaimed: taxSavedOnDeduction(LIMIT_80CCD1B - usedNps, taxable),
      fullyClaimed: usedNps >= LIMIT_80CCD1B,
      howToClaim: [
        "Open NPS Tier 1 account",
        "Contribute ₹50,000 additionally",
        "Over and above 80C limit",
        "Available in New Regime too",
      ],
      actionLabel: "Claim this deduction →",
      actionType: "claim",
      applicable: true,
    },
    {
      id: "24b",
      title: "Section 24(B) — Home Loan Interest",
      used: usedHome,
      limit: LIMIT_HOME_LOAN,
      remaining: LIMIT_HOME_LOAN - usedHome,
      taxSavingIfClaimed: taxSavedOnDeduction(LIMIT_HOME_LOAN - usedHome, taxable),
      fullyClaimed: usedHome >= LIMIT_HOME_LOAN,
      howToClaim: [
        "Interest paid on home loan",
        "Max ₹2L per year for self-occupied",
        "No limit for let-out property",
        "Get interest certificate from bank",
      ],
      actionLabel: "Claim this deduction →",
      actionType: "claim",
      applicable: true,
    },
    {
      id: "hra",
      title: "HRA Exemption",
      used: usedHra,
      limit: input.salaryBusiness > 0 ? estimateHraPotential(input.salaryBusiness) : null,
      remaining: Math.max(0, (input.salaryBusiness > 0 ? estimateHraPotential(input.salaryBusiness) : 0) - usedHra),
      taxSavingIfClaimed:
        usedHra > 0
          ? 0
          : input.salaryBusiness > 0
            ? taxSavedOnDeduction(estimateHraPotential(input.salaryBusiness), taxable)
            : 0,
      fullyClaimed: usedHra > 0,
      howToClaim: [
        "Actual HRA received from employer",
        "50% of salary (metro) / 40% (non-metro)",
        "Actual rent paid minus 10% of salary",
        "Whichever is lowest",
      ],
      actionLabel: "Calculate my HRA →",
      actionType: "calculate",
      applicable: input.salaryBusiness > 0,
    },
  ];

  const taxableLtcg = Math.max(0, input.ltcg - LTCG_EXEMPTION);
  if (taxableLtcg > 0) {
    const bondInvest = Math.min(taxableLtcg, 50_00_000);
    sections.push({
      id: "54ec",
      title: "Section 54EC — Capital Gains Bonds",
      subtitle: "Only if LTCG > 0",
      used: 0,
      limit: bondInvest,
      remaining: bondInvest,
      taxSavingIfClaimed: Math.round(bondInvest * LTCG_RATE),
      fullyClaimed: false,
      howToClaim: [
        "Invest LTCG in REC/NHAI bonds",
        "Within 6 months of sale",
        "Max ₹50L investment",
        "5 year lock-in",
      ],
      actionLabel: "Learn more →",
      actionType: "learn",
      applicable: true,
    });
  }

  sections.push({
    id: "sgb",
    title: "Sovereign Gold Bonds",
    subtitle: "Tax-free capital gains on maturity",
    used: 0,
    limit: null,
    remaining: 0,
    taxSavingIfClaimed: 0,
    fullyClaimed: false,
    howToClaim: [
      "Buy SGBs instead of physical gold",
      "2.5% annual interest — fully taxable",
      "Capital gains tax-free if held 8 years",
      "Next RBI tranche: check RBI notifications",
    ],
    actionLabel: "Learn more →",
    actionType: "learn",
    applicable: input.salaryBusiness > 0 || input.interest > 0,
  });

  const applicableSections = sections.filter((s) => s.applicable);
  const claimedCount = applicableSections.filter((s) => s.fullyClaimed).length;

  const currentDeductions =
    used80C + used80D + usedNps + usedHome + usedHra + Math.max(0, input.deduction80TTA) + Math.max(0, input.otherDeductions);

  const hraMax = input.salaryBusiness > 0 ? estimateHraPotential(input.salaryBusiness) : 0;
  const maximumPossible =
    LIMIT_80C +
    limit80D +
    LIMIT_80CCD1B +
    LIMIT_HOME_LOAN +
    hraMax +
    (taxableLtcg > 0 ? Math.min(taxableLtcg, 50_00_000) : 0);

  const gap = Math.max(0, maximumPossible - currentDeductions);

  const maxInput = applyMaxDeductions(input);
  const maxResult = computeTax(maxInput);
  const currentTax = Math.round(
    result.winningRegime === "old" ? result.old.totalTax : result.new.totalTax,
  );
  const minTax = Math.round(Math.min(maxResult.old.totalTax, maxResult.new.totalTax));
  const totalTaxSaving = Math.max(0, currentTax - minTax);
  const leftOnTable = applicableSections.reduce((sum, s) => sum + s.taxSavingIfClaimed, 0);

  const progressPercent =
    applicableSections.length > 0
      ? Math.round((claimedCount / applicableSections.length) * 100)
      : 0;

  const regimeSavings = Math.abs(maxResult.old.totalTax - maxResult.new.totalTax);
  const regimeMessage =
    maxResult.old.totalTax <= maxResult.new.totalTax
      ? `If you claim all deductions, Old Regime saves you ${formatInr(Math.round(regimeSavings))} more than New Regime.`
      : `Even with all deductions, New Regime saves you ${formatInr(Math.round(regimeSavings))}.`;

  const checklist: ChecklistItem[] = [];
  const fyEnd = "31 March 2026";

  if (sections.find((s) => s.id === "80c")!.remaining > 0) {
    checklist.push({
      id: "chk-80c",
      sectionId: "80c",
      label: `80C — Invest ${formatInr(sections.find((s) => s.id === "80c")!.remaining)} more`,
      detail: "ELSS, PPF, or LIC premium",
      deadline: fyEnd,
      amount: sections.find((s) => s.id === "80c")!.remaining,
    });
  }
  if (sections.find((s) => s.id === "80d")!.remaining > 0) {
    checklist.push({
      id: "chk-80d",
      sectionId: "80d",
      label: "80D — Buy health insurance",
      detail: "Self, family, or parents",
      deadline: "Any time this FY",
      amount: sections.find((s) => s.id === "80d")!.remaining,
    });
  }
  if (sections.find((s) => s.id === "80ccd1b")!.remaining > 0) {
    checklist.push({
      id: "chk-nps",
      sectionId: "80ccd1b",
      label: "80CCD(1B) — Open NPS account",
      detail: `Contribute ${formatInr(sections.find((s) => s.id === "80ccd1b")!.remaining)}`,
      deadline: fyEnd,
      amount: sections.find((s) => s.id === "80ccd1b")!.remaining,
    });
  }
  if (sections.find((s) => s.id === "24b")!.remaining > 0) {
    checklist.push({
      id: "chk-home",
      sectionId: "24b",
      label: "Home loan — Get interest certificate",
      detail: "From your lender before ITR filing",
      deadline: "Before ITR filing",
    });
  }
  if (sections.find((s) => s.id === "hra")?.applicable && !sections.find((s) => s.id === "hra")!.fullyClaimed) {
    checklist.push({
      id: "chk-hra",
      sectionId: "hra",
      label: "HRA — Submit rent receipts to employer",
      detail: "Before March payroll",
      deadline: "Before March payroll",
    });
  }

  const wealthPrefills: WealthPrefillSuggestion[] = [];
  const rem80c = sections.find((s) => s.id === "80c")!.remaining;
  if (rem80c > 0) {
    wealthPrefills.push({
      name: "ELSS — 80C top-up",
      category: "equity",
      value: rem80c,
      notes: "Suggested from Deduction Maximiser",
    });
  }
  const remNps = sections.find((s) => s.id === "80ccd1b")!.remaining;
  if (remNps > 0) {
    wealthPrefills.push({
      name: "NPS Tier 1 — 80CCD(1B)",
      category: "other",
      value: remNps,
      notes: "Additional NPS beyond 80C",
    });
  }
  if (sections.find((s) => s.id === "sgb")!.applicable) {
    wealthPrefills.push({
      name: "Sovereign Gold Bonds",
      category: "gold",
      value: 50_000,
      notes: "Tax-efficient gold allocation",
    });
  }

  const expertAgenda = `Tax deduction maximisation for FY 2025-26. Current deductions ${formatInr(currentDeductions)}, gap ${formatInr(gap)}. Potential tax saving ${formatInr(totalTaxSaving)} if all deductions claimed. ${regimeMessage}`;

  return {
    sections: applicableSections,
    summary: {
      currentDeductions,
      maximumPossible,
      gap,
      currentTax,
      minimumPossibleTax: minTax,
      totalTaxSaving,
      leftOnTable,
      progressPercent,
      claimedCount,
      applicableCount: applicableSections.length,
    },
    regimeAfterMax: {
      oldTax: Math.round(maxResult.old.totalTax),
      newTax: Math.round(maxResult.new.totalTax),
      winningRegime: maxResult.old.totalTax <= maxResult.new.totalTax ? "old" : "new",
      savings: Math.round(regimeSavings),
      message: regimeMessage,
    },
    checklist,
    wealthPrefills,
    expertAgenda,
  };
}

export const WEALTH_PREFILL_STORAGE_KEY = "aurelius-tax-wealth-prefills";

export function storeWealthPrefills(prefills: WealthPrefillSuggestion[]) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(WEALTH_PREFILL_STORAGE_KEY, JSON.stringify(prefills));
}
