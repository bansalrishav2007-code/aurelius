import { formatInr } from "./calculations";

export const FY_LABEL = "FY 2025-26";

export const ASSESSMENT_YEAR = "2026-27";

export function taxPdfFileName(memberName: string): string {
  const slug = memberName.trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "") || "Principal";
  return `Aurelius_Tax_${slug}_AY2627.pdf`;
}
export const STANDARD_DEDUCTION = 50_000;
export const LIMIT_80C = 150_000;
export const LIMIT_80D_SENIOR = 50_000;
export const LIMIT_80D = 25_000;
export const LIMIT_80CCD1B = 50_000;
export const LIMIT_HOME_LOAN = 200_000;
export const LIMIT_80TTA = 10_000;
export const LTCG_EXEMPTION = 125_000;
export const STCG_RATE = 0.2;
export const LTCG_RATE = 0.125;
export const CESS_RATE = 0.04;

export type TaxCalculatorInput = {
  salaryBusiness: number;
  rental: number;
  stcg: number;
  ltcg: number;
  interest: number;
  dividend: number;
  other: number;
  deduction80C: number;
  deduction80D: number;
  isSenior: boolean;
  deduction80CCD1B: number;
  hraExemption: number;
  homeLoanInterest: number;
  deduction80TTA: number;
  otherDeductions: number;
  extra80C?: number;
  extraNPS?: number;
  extra80D?: number;
  // Extended Section 80 deductions
  deduction80CCC?: number;
  deduction80CCD1?: number;
  deduction80CCD2?: number;
  deduction80DParents?: number;
  deduction80DD?: number;
  deduction80DDB?: number;
  deduction80E?: number;
  deduction80EE?: number;
  deduction80G?: number;
  deduction80GG?: number;
  deduction80TTB?: number;
  deduction80U?: number;
  ltaExemption?: number;
  professionalTax?: number;
  exemption54?: number;
  exemption54EC?: number;
  exemption54F?: number;
  // TDS & tax payments
  tdsSalary?: number;
  tdsFdInterest?: number;
  tdsRent?: number;
  tdsProfessionalFees?: number;
  tdsPropertySale?: number;
  advanceTaxPaid?: number;
  selfAssessmentTaxPaid?: number;
};

export type SlabBreakdown = {
  label: string;
  from: number;
  to: number | null;
  rate: number;
  taxableInSlab: number;
  tax: number;
};

export type RegimeResult = {
  regime: "old" | "new";
  taxableIncome: number;
  slabTax: number;
  stcgTax: number;
  ltcgTax: number;
  rebate87A: number;
  taxBeforeSurcharge: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
  slabBreakdown: SlabBreakdown[];
  totalDeductions: number;
};

export type AdvanceTaxInstallment = {
  dueDate: string;
  label: string;
  cumulativePercent: number;
  amount: number;
};

export type TaxInsight = {
  id: string;
  title: string;
  action: string;
  taxSaved: number;
  section: string;
};

export type TaxCalculatorResult = {
  fy: string;
  grossRegularIncome: number;
  totalGrossIncome: number;
  old: RegimeResult;
  new: RegimeResult;
  winningRegime: "old" | "new";
  savings: number;
  advanceTaxRequired: boolean;
  advanceTax: AdvanceTaxInstallment[];
  nextAdvanceDue: { label: string; amount: number; daysUntil: number } | null;
  insights: TaxInsight[];
};

const NEW_SLABS: { from: number; to: number | null; rate: number }[] = [
  { from: 0, to: 300_000, rate: 0 },
  { from: 300_000, to: 700_000, rate: 0.05 },
  { from: 700_000, to: 1_000_000, rate: 0.1 },
  { from: 1_000_000, to: 1_200_000, rate: 0.15 },
  { from: 1_200_000, to: 1_500_000, rate: 0.2 },
  { from: 1_500_000, to: null, rate: 0.3 },
];

const OLD_SLABS: { from: number; to: number | null; rate: number }[] = [
  { from: 0, to: 250_000, rate: 0 },
  { from: 250_000, to: 500_000, rate: 0.05 },
  { from: 500_000, to: 1_000_000, rate: 0.2 },
  { from: 1_000_000, to: null, rate: 0.3 },
];

function clampDeduction(value: number, max: number): number {
  return Math.min(Math.max(0, value), max);
}

function computeSlabTax(
  taxableIncome: number,
  slabs: { from: number; to: number | null; rate: number }[],
): { tax: number; breakdown: SlabBreakdown[] } {
  let remaining = Math.max(0, taxableIncome);
  let tax = 0;
  const breakdown: SlabBreakdown[] = [];

  for (const slab of slabs) {
    const slabWidth = slab.to == null ? Infinity : slab.to - slab.from;
    const taxableInSlab = Math.min(remaining, slabWidth);
    if (taxableInSlab <= 0) {
      breakdown.push({
        label: slab.to ? `${formatInr(slab.from)} – ${formatInr(slab.to)}` : `Above ${formatInr(slab.from)}`,
        from: slab.from,
        to: slab.to,
        rate: slab.rate,
        taxableInSlab: 0,
        tax: 0,
      });
      continue;
    }
    const slabTax = taxableInSlab * slab.rate;
    tax += slabTax;
    breakdown.push({
      label: slab.to ? `${formatInr(slab.from)} – ${formatInr(slab.to)}` : `Above ${formatInr(slab.from)}`,
      from: slab.from,
      to: slab.to,
      rate: slab.rate,
      taxableInSlab,
      tax: slabTax,
    });
    remaining -= taxableInSlab;
  }

  return { tax, breakdown };
}

function surchargeRate(totalIncome: number): number {
  if (totalIncome > 5_00_00_000) return 0.37;
  if (totalIncome > 2_00_00_000) return 0.25;
  if (totalIncome > 1_00_00_000) return 0.15;
  if (totalIncome > 50_00_000) return 0.1;
  return 0;
}

function applyRebate87A(regime: "old" | "new", totalIncome: number, slabTax: number): number {
  const limit = regime === "new" ? 700_000 : 500_000;
  if (totalIncome <= limit) return slabTax;
  return 0;
}

function computeCapitalGainsTax(
  stcg: number,
  ltcg: number,
  exemptions: { exemption54?: number; exemption54EC?: number; exemption54F?: number } = {},
) {
  const stcgTax = Math.max(0, stcg) * STCG_RATE;
  const reinvestExempt = Math.max(0, (exemptions.exemption54 ?? 0) + (exemptions.exemption54EC ?? 0) + (exemptions.exemption54F ?? 0));
  const taxableLtcg = Math.max(0, Math.max(0, ltcg) - LTCG_EXEMPTION - reinvestExempt);
  const ltcgTax = taxableLtcg * LTCG_RATE;
  return { stcgTax, ltcgTax };
}

function oldRegimeDeductions(input: TaxCalculatorInput): number {
  const limit80D = input.isSenior ? LIMIT_80D_SENIOR : LIMIT_80D;
  const d80C = clampDeduction(
    input.deduction80C +
      (input.extra80C ?? 0) +
      (input.deduction80CCC ?? 0) +
      (input.deduction80CCD1 ?? 0),
    LIMIT_80C,
  );
  const dSelf80D = clampDeduction(input.deduction80D, limit80D);
  const dParents80D = clampDeduction((input.deduction80DParents ?? 0) + (input.extra80D ?? 0), limit80D);
  const dNps = clampDeduction(input.deduction80CCD1B + (input.extraNPS ?? 0), LIMIT_80CCD1B);
  const dHome = clampDeduction(input.homeLoanInterest, LIMIT_HOME_LOAN);
  const d80TTA = input.isSenior ? 0 : clampDeduction(input.deduction80TTA, LIMIT_80TTA);
  const d80TTB = input.isSenior ? clampDeduction(input.deduction80TTB ?? 0, 50_000) : 0;
  const hra = Math.max(0, input.hraExemption);
  const lta = Math.max(0, input.ltaExemption ?? 0);
  const profTax = Math.max(0, input.professionalTax ?? 0);
  const section80Misc =
    (input.deduction80DD ?? 0) +
    (input.deduction80DDB ?? 0) +
    (input.deduction80E ?? 0) +
    (input.deduction80EE ?? 0) +
    (input.deduction80G ?? 0) +
    (input.deduction80GG ?? 0) +
    (input.deduction80U ?? 0);
  const other = Math.max(0, input.otherDeductions);
  return (
    d80C +
    dSelf80D +
    dParents80D +
    dNps +
    dHome +
    d80TTA +
    d80TTB +
    hra +
    lta +
    profTax +
    section80Misc +
    other +
    STANDARD_DEDUCTION
  );
}

function computeRegime(
  regime: "old" | "new",
  input: TaxCalculatorInput,
  grossRegular: number,
  totalGross: number,
): RegimeResult {
  const { stcgTax, ltcgTax } = computeCapitalGainsTax(input.stcg, input.ltcg, {
    exemption54: input.exemption54,
    exemption54EC: input.exemption54EC,
    exemption54F: input.exemption54F,
  });
  const totalDeductions =
    regime === "new"
      ? input.salaryBusiness > 0
        ? STANDARD_DEDUCTION
        : 0
      : oldRegimeDeductions(input);
  const taxableIncome = Math.max(0, grossRegular - totalDeductions);
  const slabs = regime === "new" ? NEW_SLABS : OLD_SLABS;
  const { tax: rawSlabTax, breakdown } = computeSlabTax(taxableIncome, slabs);
  const rebate87A = applyRebate87A(regime, totalGross, rawSlabTax);
  const slabTax = Math.max(0, rawSlabTax - rebate87A);
  const taxBeforeSurcharge = slabTax + stcgTax + ltcgTax;
  const surcharge = taxBeforeSurcharge * surchargeRate(totalGross);
  const cess = (taxBeforeSurcharge + surcharge) * CESS_RATE;
  const totalTax = taxBeforeSurcharge + surcharge + cess;

  return {
    regime,
    taxableIncome,
    slabTax,
    stcgTax,
    ltcgTax,
    rebate87A,
    taxBeforeSurcharge,
    surcharge,
    cess,
    totalTax,
    effectiveRate: totalGross > 0 ? totalTax / totalGross : 0,
    slabBreakdown: breakdown,
    totalDeductions,
  };
}

const ADVANCE_DATES = [
  { dueDate: "2025-06-15", label: "15 June", cumulativePercent: 0.15 },
  { dueDate: "2025-09-15", label: "15 September", cumulativePercent: 0.45 },
  { dueDate: "2025-12-15", label: "15 December", cumulativePercent: 0.75 },
  { dueDate: "2026-03-15", label: "15 March", cumulativePercent: 1 },
];

function buildAdvanceTax(totalTax: number): {
  required: boolean;
  installments: AdvanceTaxInstallment[];
  nextDue: { label: string; amount: number; daysUntil: number } | null;
} {
  if (totalTax <= 10_000) {
    return { required: false, installments: [], nextDue: null };
  }

  const installments = ADVANCE_DATES.map((d) => ({
    dueDate: d.dueDate,
    label: d.label,
    cumulativePercent: d.cumulativePercent,
    amount: Math.round(totalTax * d.cumulativePercent),
  }));

  const now = new Date();
  let nextDue: { label: string; amount: number; daysUntil: number } | null = null;
  for (const inst of installments) {
    const due = new Date(inst.dueDate);
    if (due >= now) {
      const daysUntil = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
      nextDue = { label: inst.label, amount: inst.amount, daysUntil };
      break;
    }
  }

  return { required: true, installments, nextDue };
}

function marginalRateOld(taxableIncome: number): number {
  if (taxableIncome > 1_000_000) return 0.3;
  if (taxableIncome > 500_000) return 0.2;
  if (taxableIncome > 250_000) return 0.05;
  return 0;
}

export function buildTaxInsights(input: TaxCalculatorInput, result: TaxCalculatorResult): TaxInsight[] {
  const insights: TaxInsight[] = [];
  const winning = result.winningRegime === "old" ? result.old : result.new;
  const topSlab = winning.slabBreakdown.filter((s) => s.taxableInSlab > 0).at(-1);
  const topRate = topSlab ? topSlab.rate : 0;

  if (topRate > 0) {
    insights.push({
      id: "effective-rate",
      title: `You are in the ${Math.round(topRate * 100)}% slab`,
      action: `Your effective rate is ${(winning.effectiveRate * 100).toFixed(1)}% after deductions and capital gains tax.`,
      taxSaved: 0,
      section: "Income-tax slabs",
    });
  }

  const used80C = clampDeduction(input.deduction80C + (input.extra80C ?? 0), LIMIT_80C);
  const headroom80C = LIMIT_80C - used80C;
  if (headroom80C > 0 && result.winningRegime === "old") {
    const rate = marginalRateOld(result.old.taxableIncome);
    const saved = Math.round(headroom80C * rate * (1 + CESS_RATE));
    insights.push({
      id: "80c-headroom",
      title: `80C limit has ${formatInr(headroom80C)} headroom`,
      action: `Invest ${formatInr(headroom80C)} more in ELSS, PPF, or LIC to maximise Section 80C.`,
      taxSaved: saved,
      section: "Section 80C",
    });
  }

  const usedNps = clampDeduction(input.deduction80CCD1B + (input.extraNPS ?? 0), LIMIT_80CCD1B);
  const headroomNps = LIMIT_80CCD1B - usedNps;
  if (headroomNps > 0 && result.winningRegime === "old") {
    const rate = marginalRateOld(result.old.taxableIncome);
    const saved = Math.round(headroomNps * rate * (1 + CESS_RATE));
    insights.push({
      id: "nps-headroom",
      title: "Additional NPS contribution available",
      action: `Adding ${formatInr(headroomNps)} to NPS under 80CCD(1B) reduces taxable income.`,
      taxSaved: saved,
      section: "Section 80CCD(1B)",
    });
  }

  if (result.old.totalDeductions > 200_000 && result.winningRegime === "old") {
    insights.push({
      id: "old-regime-wins",
      title: "Old regime is better for you",
      action: `Your deductions of ${formatInr(result.old.totalDeductions)} exceed the new-regime break-even — stay on the old regime.`,
      taxSaved: result.savings,
      section: "Section 115BAC (opt-out)",
    });
  }

  if (result.winningRegime === "new" && result.savings > 0) {
    insights.push({
      id: "new-regime-wins",
      title: "New regime is more efficient",
      action: `Default new regime saves ${formatInr(result.savings)} versus old regime with your current deductions.`,
      taxSaved: result.savings,
      section: "Section 115BAC",
    });
  }

  if (input.ltcg > 0) {
    const taxable = Math.max(0, input.ltcg - LTCG_EXEMPTION);
    insights.push({
      id: "ltcg-exemption",
      title: "LTCG exemption applied",
      action:
        taxable > 0
          ? `Your LTCG of ${formatInr(input.ltcg)} — ${formatInr(taxable)} is taxable after the ₹1.25L exemption.`
          : `Your LTCG of ${formatInr(input.ltcg)} is fully covered by the ₹1.25L exemption.`,
      taxSaved: Math.round(Math.min(input.ltcg, LTCG_EXEMPTION) * LTCG_RATE),
      section: "Section 112A",
    });
  }

  return insights;
}

export function computeTax(input: TaxCalculatorInput): TaxCalculatorResult {
  const grossRegular =
    Math.max(0, input.salaryBusiness) +
    Math.max(0, input.rental) +
    Math.max(0, input.interest) +
    Math.max(0, input.dividend) +
    Math.max(0, input.other);
  const totalGross = grossRegular + Math.max(0, input.stcg) + Math.max(0, input.ltcg);

  const old = computeRegime("old", input, grossRegular, totalGross);
  const newReg = computeRegime("new", input, grossRegular, totalGross);
  const winningRegime = old.totalTax <= newReg.totalTax ? "old" : "new";
  const savings = Math.abs(old.totalTax - newReg.totalTax);
  const winningTax = winningRegime === "old" ? old.totalTax : newReg.totalTax;
  const advance = buildAdvanceTax(winningTax);

  const result: TaxCalculatorResult = {
    fy: FY_LABEL,
    grossRegularIncome: grossRegular,
    totalGrossIncome: totalGross,
    old,
    new: newReg,
    winningRegime,
    savings,
    advanceTaxRequired: advance.required,
    advanceTax: advance.installments,
    nextAdvanceDue: advance.nextDue,
    insights: [],
  };

  result.insights = buildTaxInsights(input, result);
  return result;
}

export function defaultTaxInput(): TaxCalculatorInput {
  return {
    salaryBusiness: 0,
    rental: 0,
    stcg: 0,
    ltcg: 0,
    interest: 0,
    dividend: 0,
    other: 0,
    deduction80C: 0,
    deduction80D: 0,
    isSenior: false,
    deduction80CCD1B: 0,
    hraExemption: 0,
    homeLoanInterest: 0,
    deduction80TTA: 0,
    otherDeductions: 0,
    extra80C: 0,
    extraNPS: 0,
    extra80D: 0,
    deduction80CCC: 0,
    deduction80CCD1: 0,
    deduction80CCD2: 0,
    deduction80DParents: 0,
    deduction80DD: 0,
    deduction80DDB: 0,
    deduction80E: 0,
    deduction80EE: 0,
    deduction80G: 0,
    deduction80GG: 0,
    deduction80TTB: 0,
    deduction80U: 0,
    ltaExemption: 0,
    professionalTax: 0,
    exemption54: 0,
    exemption54EC: 0,
    exemption54F: 0,
    tdsSalary: 0,
    tdsFdInterest: 0,
    tdsRent: 0,
    tdsProfessionalFees: 0,
    tdsPropertySale: 0,
    advanceTaxPaid: 0,
    selfAssessmentTaxPaid: 0,
  };
}

export function taxInputFromSnapshot(snapshot: {
  totalIncome?: number;
  stcg?: number;
  ltcg?: number;
  used80C?: number;
  used80D?: number;
}): Partial<TaxCalculatorInput> {
  const total = snapshot.totalIncome ?? 0;
  const stcg = snapshot.stcg ?? 0;
  const ltcg = snapshot.ltcg ?? 0;
  const regular = Math.max(0, total - stcg - ltcg);
  return {
    salaryBusiness: regular,
    stcg,
    ltcg,
    deduction80C: snapshot.used80C ?? 0,
    deduction80D: snapshot.used80D ?? 0,
  };
}
