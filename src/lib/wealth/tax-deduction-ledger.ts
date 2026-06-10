import {
  CESS_RATE,
  LIMIT_80C,
  LIMIT_80CCD1B,
  LIMIT_80D,
  LIMIT_80D_SENIOR,
  LIMIT_HOME_LOAN,
  LIMIT_80TTA,
  LTCG_EXEMPTION,
  STANDARD_DEDUCTION,
  type TaxCalculatorInput,
  type TaxCalculatorResult,
} from "./tax-calculator";

export type DeductionLedgerItem = {
  id: string;
  group: "section80" | "other" | "capital_gains";
  section: string;
  label: string;
  detail?: string;
  amount: number;
  limit?: number;
  taxSaved: number;
  claimed: boolean;
  auto?: boolean;
  maxReached?: boolean;
};

export type TdsLedgerItem = {
  id: string;
  label: string;
  amount: number;
};

export type TdsReconciliation = {
  grossTaxLiability: number;
  slabTax: number;
  surcharge: number;
  cess: number;
  totalTdsPaid: number;
  balancePayable: number;
  refundDue: number;
  isRefund: boolean;
  winningRegime: "old" | "new";
  items: TdsLedgerItem[];
  nextPaymentDate: string | null;
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

function taxSavedOn(amount: number, taxableIncome: number): number {
  if (amount <= 0) return 0;
  return Math.round(amount * marginalRateOld(taxableIncome) * (1 + CESS_RATE));
}

function combined80C(input: TaxCalculatorInput): number {
  return clamp(
    input.deduction80C +
      (input.extra80C ?? 0) +
      (input.deduction80CCC ?? 0) +
      (input.deduction80CCD1 ?? 0),
    LIMIT_80C,
  );
}

function self80D(input: TaxCalculatorInput): number {
  const limit = input.isSenior ? LIMIT_80D_SENIOR : LIMIT_80D;
  return clamp(input.deduction80D, limit);
}

function parents80D(input: TaxCalculatorInput): number {
  const limit = input.isSenior ? LIMIT_80D_SENIOR : LIMIT_80D;
  return clamp((input.deduction80DParents ?? 0) + (input.extra80D ?? 0), limit);
}

export function computeTdsReconciliation(
  input: TaxCalculatorInput,
  result: TaxCalculatorResult,
): TdsReconciliation {
  const winning = result.winningRegime === "old" ? result.old : result.new;
  const items: TdsLedgerItem[] = [
    { id: "tds_salary", label: "TDS on Salary (Form 16)", amount: input.tdsSalary ?? 0 },
    { id: "tds_fd", label: "TDS on FD Interest (26AS)", amount: input.tdsFdInterest ?? 0 },
    { id: "tds_rent", label: "TDS on Rent received (194I)", amount: input.tdsRent ?? 0 },
    { id: "tds_prof", label: "TDS on Professional fees (194J)", amount: input.tdsProfessionalFees ?? 0 },
    { id: "tds_property", label: "TDS on Sale of property (194IA)", amount: input.tdsPropertySale ?? 0 },
    { id: "advance_tax", label: "Advance tax paid", amount: input.advanceTaxPaid ?? 0 },
    { id: "self_assessment", label: "Self assessment tax paid", amount: input.selfAssessmentTaxPaid ?? 0 },
  ];

  const totalTdsPaid = items.reduce((s, i) => s + i.amount, 0);
  const grossTaxLiability = Math.round(winning.totalTax);
  const net = grossTaxLiability - totalTdsPaid;

  return {
    grossTaxLiability,
    slabTax: Math.round(winning.slabTax + winning.stcgTax + winning.ltcgTax),
    surcharge: Math.round(winning.surcharge),
    cess: Math.round(winning.cess),
    totalTdsPaid,
    balancePayable: net > 0 ? net : 0,
    refundDue: net < 0 ? Math.abs(net) : 0,
    isRefund: net < 0,
    winningRegime: result.winningRegime,
    items,
    nextPaymentDate: net > 0 && result.nextAdvanceDue ? result.nextAdvanceDue.label : null,
  };
}

export function buildDeductionLedger(
  input: TaxCalculatorInput,
  result: TaxCalculatorResult,
): DeductionLedgerItem[] {
  const taxable = result.old.taxableIncome;
  const limit80D = input.isSenior ? LIMIT_80D_SENIOR : LIMIT_80D;
  const d80C = combined80C(input);
  const dSelf80D = self80D(input);
  const dParents80D = parents80D(input);
  const dNps = clamp(input.deduction80CCD1B + (input.extraNPS ?? 0), LIMIT_80CCD1B);
  const dHome = clamp(input.homeLoanInterest, LIMIT_HOME_LOAN);
  const dHra = Math.max(0, input.hraExemption);
  const dLta = Math.max(0, input.ltaExemption ?? 0);
  const d80TTA = input.isSenior ? 0 : clamp(input.deduction80TTA, LIMIT_80TTA);
  const d80TTB = input.isSenior ? clamp(input.deduction80TTB ?? 0, 50_000) : 0;
  const profTax = Math.max(0, input.professionalTax ?? 0);
  const ltcgExempt = Math.min(Math.max(0, input.ltcg), LTCG_EXEMPTION);

  const ledger: DeductionLedgerItem[] = [];

  function push(item: Omit<DeductionLedgerItem, "claimed"> & { amount: number }) {
    ledger.push({
      ...item,
      claimed: item.amount > 0 || item.auto === true,
      taxSaved: item.taxSaved ?? taxSavedOn(item.amount, taxable),
    });
  }

  // Section 80
  if (d80C > 0 || input.deduction80C > 0 || (input.extra80C ?? 0) > 0) {
    push({
      id: "80c",
      group: "section80",
      section: "Section 80C",
      label: "ELSS / PPF / LIC / EPF",
      detail: "Combined 80C + 80CCC + 80CCD(1)",
      amount: d80C,
      limit: LIMIT_80C,
      taxSaved: taxSavedOn(d80C, taxable),
      maxReached: d80C >= LIMIT_80C,
    });
  }

  const d80CCC = clamp(input.deduction80CCC ?? 0, LIMIT_80C);
  if (d80CCC > 0) {
    push({
      id: "80ccc",
      group: "section80",
      section: "Section 80CCC",
      label: "Pension fund",
      amount: d80CCC,
      limit: LIMIT_80C,
      taxSaved: taxSavedOn(d80CCC, taxable),
    });
  }

  const d80CCD1 = clamp(input.deduction80CCD1 ?? 0, LIMIT_80C);
  if (d80CCD1 > 0) {
    push({
      id: "80ccd1",
      group: "section80",
      section: "Section 80CCD(1)",
      label: "NPS employee contribution",
      amount: d80CCD1,
      limit: LIMIT_80C,
      taxSaved: taxSavedOn(d80CCD1, taxable),
    });
  }

  if (dNps > 0) {
    push({
      id: "80ccd1b",
      group: "section80",
      section: "Section 80CCD(1B)",
      label: "Additional NPS",
      amount: dNps,
      limit: LIMIT_80CCD1B,
      taxSaved: taxSavedOn(dNps, taxable),
      maxReached: dNps >= LIMIT_80CCD1B,
    });
  }

  if ((input.deduction80CCD2 ?? 0) > 0) {
    push({
      id: "80ccd2",
      group: "section80",
      section: "Section 80CCD(2)",
      label: "Employer NPS contribution",
      amount: input.deduction80CCD2 ?? 0,
      taxSaved: 0,
    });
  }

  if (dSelf80D > 0) {
    push({
      id: "80d_self",
      group: "section80",
      section: "Section 80D",
      label: "Health insurance — self & family",
      amount: dSelf80D,
      limit: limit80D,
      taxSaved: taxSavedOn(dSelf80D, taxable),
    });
  }

  if (dParents80D > 0) {
    push({
      id: "80d_parents",
      group: "section80",
      section: "Section 80D",
      label: "Health insurance — parents",
      amount: dParents80D,
      limit: limit80D,
      taxSaved: taxSavedOn(dParents80D, taxable),
    });
  }

  const optional80: Array<{
    id: string;
    section: string;
    label: string;
    amount: number;
  }> = [
    { id: "80dd", section: "Section 80DD", label: "Disabled dependent", amount: input.deduction80DD ?? 0 },
    { id: "80ddb", section: "Section 80DDB", label: "Medical treatment", amount: input.deduction80DDB ?? 0 },
    { id: "80e", section: "Section 80E", label: "Education loan interest", amount: input.deduction80E ?? 0 },
    { id: "80ee", section: "Section 80EE", label: "First home loan interest", amount: input.deduction80EE ?? 0 },
    { id: "80g", section: "Section 80G", label: "Donations", amount: input.deduction80G ?? 0 },
    { id: "80gg", section: "Section 80GG", label: "Rent (no HRA)", amount: input.deduction80GG ?? 0 },
    { id: "80u", section: "Section 80U", label: "Disability — self", amount: input.deduction80U ?? 0 },
  ];

  for (const item of optional80) {
    if (item.amount > 0) {
      push({ ...item, group: "section80", taxSaved: taxSavedOn(item.amount, taxable) });
    }
  }

  if (d80TTA > 0) {
    push({
      id: "80tta",
      group: "section80",
      section: "Section 80TTA",
      label: "Savings account interest",
      amount: d80TTA,
      limit: LIMIT_80TTA,
      taxSaved: taxSavedOn(d80TTA, taxable),
    });
  }

  if (d80TTB > 0) {
    push({
      id: "80ttb",
      group: "section80",
      section: "Section 80TTB",
      label: "Senior citizen interest",
      amount: d80TTB,
      limit: 50_000,
      taxSaved: taxSavedOn(d80TTB, taxable),
    });
  }

  // Other deductions
  if (input.salaryBusiness > 0) {
    push({
      id: "standard",
      group: "other",
      section: "Standard Deduction",
      label: "Salaried standard deduction",
      amount: STANDARD_DEDUCTION,
      taxSaved: taxSavedOn(STANDARD_DEDUCTION, taxable),
      auto: true,
    });
  }

  if (dHra > 0) {
    push({
      id: "hra",
      group: "other",
      section: "HRA Exemption",
      label: "House rent allowance",
      amount: dHra,
      taxSaved: taxSavedOn(dHra, taxable),
    });
  }

  if (dLta > 0) {
    push({
      id: "lta",
      group: "other",
      section: "LTA Exemption",
      label: "Leave travel allowance",
      amount: dLta,
      taxSaved: taxSavedOn(dLta, taxable),
    });
  }

  if (dHome > 0) {
    push({
      id: "24b",
      group: "other",
      section: "Section 24(b)",
      label: "Home loan interest",
      amount: dHome,
      limit: LIMIT_HOME_LOAN,
      taxSaved: taxSavedOn(dHome, taxable),
    });
  }

  if (profTax > 0) {
    push({
      id: "prof_tax",
      group: "other",
      section: "Professional Tax",
      label: "Professional tax paid",
      amount: profTax,
      taxSaved: taxSavedOn(profTax, taxable),
    });
  }

  if ((input.otherDeductions ?? 0) > 0) {
    push({
      id: "other",
      group: "other",
      section: "Other",
      label: "Other deductions",
      amount: input.otherDeductions,
      taxSaved: taxSavedOn(input.otherDeductions, taxable),
    });
  }

  // Capital gains exemptions
  if (ltcgExempt > 0) {
    push({
      id: "ltcg_exempt",
      group: "capital_gains",
      section: "Section 112A",
      label: "LTCG exemption",
      detail: `${formatInr(ltcgExempt)} auto-applied`,
      amount: ltcgExempt,
      limit: LTCG_EXEMPTION,
      taxSaved: Math.round(ltcgExempt * 0.125),
      auto: true,
    });
  }

  if ((input.exemption54 ?? 0) > 0) {
    push({
      id: "54",
      group: "capital_gains",
      section: "Section 54",
      label: "Reinvestment in property",
      amount: input.exemption54 ?? 0,
      taxSaved: Math.round((input.exemption54 ?? 0) * 0.125),
    });
  }

  if ((input.exemption54EC ?? 0) > 0) {
    push({
      id: "54ec",
      group: "capital_gains",
      section: "Section 54EC",
      label: "Capital gains bonds",
      amount: input.exemption54EC ?? 0,
      taxSaved: Math.round((input.exemption54EC ?? 0) * 0.125),
    });
  }

  if ((input.exemption54F ?? 0) > 0) {
    push({
      id: "54f",
      group: "capital_gains",
      section: "Section 54F",
      label: "Reinvestment (non-property)",
      amount: input.exemption54F ?? 0,
      taxSaved: Math.round((input.exemption54F ?? 0) * 0.125),
    });
  }

  return ledger;
}

export function ledgerTotals(ledger: DeductionLedgerItem[]) {
  const claimed = ledger.filter((l) => l.claimed && l.amount > 0);
  return {
    totalDeductions: claimed.reduce((s, l) => s + l.amount, 0),
    totalTaxSaved: claimed.reduce((s, l) => s + l.taxSaved, 0),
    claimedCount: claimed.length,
  };
}
