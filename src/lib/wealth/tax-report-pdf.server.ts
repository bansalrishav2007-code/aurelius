import PDFDocument from "pdfkit";
import { buildDeductionMaximiser } from "./deduction-maximiser";
import { formatInr } from "./calculations";
import type { TaxActionPlan } from "./tax-action-plan";
import {
  ASSESSMENT_YEAR,
  computeTax,
  FY_LABEL,
  taxPdfFileName,
  type TaxCalculatorInput,
  type TaxCalculatorResult,
  type RegimeResult,
} from "./tax-calculator";
import {
  buildDeductionLedger,
  computeTdsReconciliation,
  ledgerTotals,
} from "./tax-deduction-ledger";

const NAVY = "#0A0A0F";
const NAVY_PANEL = "#0F1628";
const GOLD = "#C9A84C";
const TEXT = "#E8E6E3";
const MUTED = "#9CA3AF";
const BORDER = "#1E2A45";
const TOTAL_PAGES = 6;

type PdfDoc = InstanceType<typeof PDFDocument>;

export { taxPdfFileName };

function memberNumberFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String((hash % 99_999) + 1).padStart(5, "0");
}

function drawPageBackground(doc: PdfDoc) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
}

function drawPageChrome(doc: PdfDoc, memberName: string, memberNo: string, pageNum: number) {
  doc.save();
  doc.rect(48, 36, doc.page.width - 96, 52).fill(NAVY_PANEL);
  doc.strokeColor(BORDER).lineWidth(1).rect(48, 36, doc.page.width - 96, 52).stroke();
  doc.restore();

  doc.save();
  doc.rect(60, 46, 28, 28).fill(GOLD);
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(16).text("A", 68, 52, { lineBreak: false });
  doc.restore();

  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(12).text("AURELIUS PRIVATE", 96, 48, { lineBreak: false });
  doc.fillColor(MUTED).font("Helvetica").fontSize(7).text("TAX INTELLIGENCE", 96, 64, { lineBreak: false });

  const footerY = doc.page.height - 52;
  doc.strokeColor(BORDER).lineWidth(0.5).moveTo(48, footerY - 8).lineTo(doc.page.width - 48, footerY - 8).stroke();
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(6.5)
    .text(
      `CONFIDENTIAL — Aurelius Private. Prepared exclusively for ${memberName}. Member No. ${memberNo}. ` +
        `This report is for tax planning purposes only. Consult your CA for final ITR filing. ` +
        `Aurelius Private Wealth Intelligence · Data residency: India only.`,
      48,
      footerY,
      { width: doc.page.width - 120, align: "left", lineGap: 1 },
    );
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(8)
    .text(`Page ${pageNum} of ${TOTAL_PAGES}`, doc.page.width - 88, footerY + 2, { width: 40, align: "right" });
}

type PdfCtx = {
  doc: PdfDoc;
  memberName: string;
  memberNo: string;
  pageNum: number;
  y: number;
  bottom: number;
};

function newPage(ctx: PdfCtx) {
  ctx.doc.addPage();
  drawPageBackground(ctx.doc);
  ctx.pageNum += 1;
  drawPageChrome(ctx.doc, ctx.memberName, ctx.memberNo, ctx.pageNum);
  ctx.y = 108;
}

function ensureSpace(ctx: PdfCtx, needed = 24) {
  if (ctx.y + needed <= ctx.bottom) return;
  newPage(ctx);
}

function heading(ctx: PdfCtx, text: string, size = 12) {
  ensureSpace(ctx, 28);
  ctx.doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(size).text(text, 48, ctx.y);
  ctx.y += size + 10;
}

function subheading(ctx: PdfCtx, text: string) {
  ensureSpace(ctx, 20);
  ctx.doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(9).text(text, 48, ctx.y);
  ctx.y += 14;
}

function line(ctx: PdfCtx, label: string, value: string, indent = 0) {
  ensureSpace(ctx, 18);
  const x = 48 + indent;
  ctx.doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(label, x, ctx.y, { width: 260 });
  ctx.doc.fillColor(TEXT).font("Helvetica").fontSize(9).text(value, 310, ctx.y, { width: 230, align: "right" });
  ctx.y += 16;
}

function bullet(ctx: PdfCtx, text: string, indent = 12) {
  ensureSpace(ctx, 16);
  ctx.doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(`• ${text}`, 48 + indent, ctx.y, { width: 500 });
  ctx.y += 14;
}

function divider(ctx: PdfCtx) {
  ensureSpace(ctx, 12);
  ctx.doc.strokeColor(BORDER).lineWidth(0.5).moveTo(48, ctx.y).lineTo(ctx.doc.page.width - 48, ctx.y).stroke();
  ctx.y += 12;
}

function drawSlabTable(ctx: PdfCtx, regime: RegimeResult) {
  subheading(ctx, `TAX COMPUTATION — ${regime.regime === "old" ? "OLD" : "NEW"} REGIME`);
  line(ctx, "Income Slab", "Rate · Tax", 0);
  for (const slab of regime.slabBreakdown) {
    const range =
      slab.to != null
        ? `${formatInr(slab.from)} - ${formatInr(slab.to)}`
        : `Above ${formatInr(slab.from)}`;
    const rateLabel = `${Math.round(slab.rate * 100)}%`;
    line(ctx, range, `${rateLabel} · ${formatInr(Math.round(slab.tax))}`, 8);
  }
  divider(ctx);
  line(ctx, "Slab tax", formatInr(Math.round(regime.slabTax)));
  if (regime.stcgTax > 0) line(ctx, "STCG tax", formatInr(Math.round(regime.stcgTax)));
  if (regime.ltcgTax > 0) line(ctx, "LTCG tax", formatInr(Math.round(regime.ltcgTax)));
  line(ctx, "Surcharge", formatInr(Math.round(regime.surcharge)));
  line(ctx, "Health & Ed. Cess @ 4%", formatInr(Math.round(regime.cess)));
  ctx.doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(9);
  ensureSpace(ctx, 18);
  ctx.doc.text(`TOTAL TAX (${regime.regime.toUpperCase()}): ${formatInr(Math.round(regime.totalTax))}`, 48, ctx.y);
  ctx.y += 14;
  ctx.doc.fillColor(MUTED).font("Helvetica").fontSize(8);
  ctx.doc.text(`Effective rate: ${(regime.effectiveRate * 100).toFixed(1)}%`, 48, ctx.y);
  ctx.y += 20;
}

const DOC_CHECKLIST = [
  "Form 16 from employer",
  "Form 26AS from TRACES",
  "Interest certificates from banks",
  "Rent receipts (for HRA)",
  "Investment proofs (80C)",
  "Insurance premium receipts (80D)",
  "Home loan interest certificate",
  "NPS contribution statement",
];

export async function buildTaxReportPdf(
  memberName: string,
  input: TaxCalculatorInput,
  result: TaxCalculatorResult,
  memberId?: string,
): Promise<Buffer> {
  const memberNo = memberId ? memberNumberFromId(memberId) : "00000";
  const ledger = buildDeductionLedger(input, result);
  const { totalTaxSaved } = ledgerTotals(ledger);
  const tds = computeTdsReconciliation(input, result);
  const baseline = computeTax({
    ...input,
    deduction80C: 0,
    deduction80D: 0,
    deduction80CCD1B: 0,
    hraExemption: 0,
    homeLoanInterest: 0,
    deduction80TTA: 0,
    otherDeductions: 0,
    extra80C: 0,
    extra80D: 0,
    extraNPS: 0,
  });
  const totalTaxSavedViaDeductions = Math.max(0, Math.round(baseline.old.totalTax - result.old.totalTax));
  const maximiser = buildDeductionMaximiser(input, result);
  const generated = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const winningLabel = result.winningRegime === "old" ? "OLD REGIME" : "NEW REGIME";
  const winning = result.winningRegime === "old" ? result.old : result.new;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawPageBackground(doc);
    const ctx: PdfCtx = {
      doc,
      memberName,
      memberNo,
      pageNum: 1,
      y: 108,
      bottom: doc.page.height - 80,
    };
    drawPageChrome(doc, memberName, memberNo, 1);

    // PAGE 1 — Cover
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(22).text("AURELIUS", 48, 200, { align: "center", width: doc.page.width - 96 });
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(16).text("PRIVATE TAX INTELLIGENCE REPORT", 48, 232, {
      align: "center",
      width: doc.page.width - 96,
    });
    ctx.y = 300;
    line(ctx, "Prepared for", memberName);
    line(ctx, "Member No.", memberNo);
    line(ctx, "Financial Year", FY_LABEL);
    line(ctx, "Assessment Year", ASSESSMENT_YEAR);
    line(ctx, "Generated", generated);
    ctx.y += 24;
    doc
      .fillColor(GOLD)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("STRICTLY PRIVATE & CONFIDENTIAL", 48, ctx.y, { align: "center", width: doc.page.width - 96 });
    ctx.y = doc.page.height - 120;
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text("India data residency · Member-only document", 48, ctx.y, {
      align: "center",
      width: doc.page.width - 96,
    });

    // PAGE 2 — Income summary
    newPage(ctx);
    heading(ctx, "INCOME SUMMARY", 11);
    subheading(ctx, "SOURCES OF INCOME");
    line(ctx, "Salary / Business Income", formatInr(input.salaryBusiness));
    line(ctx, "Rental Income", formatInr(input.rental));
    line(ctx, "Short Term Capital Gains", formatInr(input.stcg));
    line(ctx, "Long Term Capital Gains", formatInr(input.ltcg));
    line(ctx, "Interest Income (FD / SB)", formatInr(input.interest));
    line(ctx, "Dividend Income", formatInr(input.dividend));
    line(ctx, "Other Income", formatInr(input.other));
    divider(ctx);
    ctx.doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(10);
    line(ctx, "GROSS TOTAL INCOME", formatInr(result.totalGrossIncome));
    ctx.y += 12;

    subheading(ctx, "REGIME RECOMMENDATION");
    const savesLabel = result.winningRegime === "new" ? "NEW REGIME RECOMMENDED" : "OLD REGIME RECOMMENDED";
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11).text(savesLabel, 48, ctx.y);
    ctx.y += 18;
    doc.fillColor(TEXT).font("Helvetica").fontSize(9).text(`Saves you ${formatInr(Math.round(result.savings))} vs the other regime`, 48, ctx.y);
    ctx.y += 20;
    line(ctx, "Old Regime Tax", formatInr(Math.round(result.old.totalTax)));
    line(ctx, "New Regime Tax", formatInr(Math.round(result.new.totalTax)));
    line(ctx, "You Save", formatInr(Math.round(result.savings)));

    // PAGE 3 — Deductions
    newPage(ctx);
    heading(ctx, "DEDUCTIONS CLAIMED (OLD REGIME)", 11);
    subheading(ctx, "SECTION 80 & OTHER DEDUCTIONS");

    for (const item of ledger.filter((l) => l.claimed && (l.amount > 0 || l.auto))) {
      subheading(ctx, `${item.section} — ${item.label}`);
      bullet(ctx, `Amount: ${formatInr(item.amount)}${item.limit ? ` (limit ${formatInr(item.limit)})` : ""}`);
      if (item.maxReached) bullet(ctx, "Maximum limit reached");
      if (item.taxSaved > 0) bullet(ctx, `Tax saved: ${formatInr(item.taxSaved)}`);
      ctx.y += 4;
    }

    divider(ctx);
    line(ctx, "TOTAL DEDUCTIONS", formatInr(result.old.totalDeductions));
    line(ctx, "TOTAL TAX SAVED VIA DEDUCTIONS", formatInr(totalTaxSavedViaDeductions));
    line(ctx, "TAXABLE INCOME", formatInr(result.old.taxableIncome));
    line(ctx, "Ledger tax saved (est.)", formatInr(totalTaxSaved));

    // PAGE 4 — TDS
    newPage(ctx);
    heading(ctx, "TDS & TAX PAYMENT", 11);
    subheading(ctx, "TAX LIABILITY RECONCILIATION");
    line(ctx, "Total tax computed", formatInr(tds.grossTaxLiability));
    line(ctx, "Add: Surcharge", formatInr(tds.surcharge));
    line(ctx, "Add: Cess @ 4%", formatInr(tds.cess));
    divider(ctx);
    line(ctx, "GROSS TAX LIABILITY", formatInr(tds.grossTaxLiability));

    subheading(ctx, "LESS: TDS / TAX ALREADY PAID");
    for (const item of tds.items) {
      if (item.amount > 0) line(ctx, item.label, formatInr(item.amount), 8);
    }
    if (tds.totalTdsPaid === 0) bullet(ctx, "No TDS or advance tax entered");
    divider(ctx);
    line(ctx, "TOTAL TAX PAID", formatInr(tds.totalTdsPaid));

    ctx.y += 8;
    subheading(ctx, "NET POSITION");
    if (tds.isRefund) {
      doc.fillColor("#4ADE80").font("Helvetica-Bold").fontSize(11);
      ensureSpace(ctx, 24);
      doc.text(`TAX REFUND DUE: ${formatInr(tds.refundDue)}`, 48, ctx.y);
      ctx.y += 16;
      doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("File ITR to claim refund", 48, ctx.y);
      ctx.y += 20;
    } else if (tds.balancePayable > 0) {
      doc.fillColor("#FBBF24").font("Helvetica-Bold").fontSize(11);
      ensureSpace(ctx, 24);
      doc.text(`BALANCE TAX PAYABLE: ${formatInr(tds.balancePayable)}`, 48, ctx.y);
      ctx.y += 16;
      doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Pay before: 31 March 2026", 48, ctx.y);
      ctx.y += 20;
    } else {
      bullet(ctx, "Tax fully paid — no balance or refund");
    }

    // PAGE 5 — Slab breakdown
    newPage(ctx);
    heading(ctx, "SLAB WISE BREAKDOWN", 11);
    drawSlabTable(ctx, result.new);
    drawSlabTable(ctx, result.old);

    // PAGE 6 — Action plan
    newPage(ctx);
    heading(ctx, `YOUR TAX ACTION PLAN ${FY_LABEL}`, 11);

    if (result.advanceTaxRequired && tds.balancePayable > 10_000) {
      subheading(ctx, "ADVANCE TAX SCHEDULE");
      let prev = 0;
      for (const inst of result.advanceTax) {
        const incremental = Math.round(inst.amount - prev);
        const pct = Math.round(inst.cumulativePercent * 100);
        const status = (input.advanceTaxPaid ?? 0) >= inst.amount ? "PAID" : "DUE";
        line(ctx, `${inst.label} ${inst.dueDate.slice(0, 4)}`, `${pct}% · ${formatInr(incremental)} [${status}]`);
        prev = inst.amount;
      }
      ctx.y += 8;
    }

    const missed = maximiser.sections.filter((s) => s.applicable && s.remaining > 0 && s.id !== "54ec" && s.id !== "sgb");
    if (missed.length > 0) {
      subheading(ctx, "MISSED DEDUCTIONS");
      for (const section of missed.slice(0, 5)) {
        bullet(ctx, `${section.title}: invest ${formatInr(section.remaining)} — save ${formatInr(section.taxSavingIfClaimed)}`);
      }
      line(ctx, "TOTAL ADDITIONAL SAVING POSSIBLE", formatInr(maximiser.summary.totalTaxSaving));
      ctx.y += 8;
    }

    subheading(ctx, "DOCUMENTS TO COLLECT");
    for (const docItem of DOC_CHECKLIST) {
      bullet(ctx, docItem);
    }

    ctx.y += 8;
    line(ctx, "Recommended regime", winningLabel);
    line(ctx, "Winning regime tax", formatInr(Math.round(winning.totalTax)));

    doc.end();
  });
}

export async function buildTaxActionPlanPdf(
  memberName: string,
  plan: TaxActionPlan,
  fy: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(14).text("AURELIUS", 48, 48);
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text("PRIVATE WEALTH INTELLIGENCE", 48, 66);
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(18).text("Tax Saving Action Plan", 48, 96);
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(10)
      .text(`Prepared for ${memberName} · ${fy} · ${new Date().toLocaleDateString("en-IN")}`, 48, 122);

    let y = 158;
    const lineFn = (label: string, value: string) => {
      doc.fillColor(MUTED).font("Helvetica").fontSize(9).text(label, 48, y, { width: 220 });
      doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(10).text(value, 280, y, { width: 260 });
      y += 22;
    };

    lineFn("Current estimated tax", formatInr(plan.currentTax));
    lineFn("Identified savings", formatInr(plan.identifiedSavings));
    lineFn("Recommendations", String(plan.actions.length));

    y += 10;
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11).text("Action plan", 48, y);
    y += 18;

    for (const action of plan.actions) {
      if (y > 700) {
        doc.addPage();
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
        y = 48;
      }
      doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(9).text(`${action.priority.toUpperCase()} · ${action.title}`, 48, y, {
        width: 500,
      });
      y += 14;
      doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(action.recommendation, 48, y, { width: 500 });
      y += 28;
      doc.fillColor(GOLD).font("Helvetica").fontSize(8).text(`Save ${formatInr(action.taxSaved)} · ${action.section}`, 48, y);
      y += 22;
    }

    y += 8;
    doc
      .fillColor(MUTED)
      .font("Helvetica-Oblique")
      .fontSize(8)
      .text(
        "All recommendations are based on current IT Act provisions. Aurelius does not file taxes. Consult your CA before implementation.",
        48,
        y,
        { width: 500 },
      );

    doc.end();
  });
}
