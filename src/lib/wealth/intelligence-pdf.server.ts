import PDFDocument from "pdfkit";
import { formatInr } from "./calculations";
import { briefPdfFileName } from "./colors";
import type { WealthIntelligenceReport, WealthRecommendationCategory } from "./types";

const NAVY = "#0A0E1A";
const NAVY_PANEL = "#0F1628";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C96D";
const TEXT = "#E8E6E3";
const MUTED = "#9CA3AF";
const BORDER = "#1E2A45";

function categoryBadgeLabel(category: WealthRecommendationCategory): string {
  switch (category) {
    case "allocation":
      return "ALLOCATION";
    case "tax":
      return "TAX";
    case "gold":
      return "GOLD";
    case "legal_structure":
      return "LEGAL STRUCTURE";
    default:
      return "ADVISORY";
  }
}

type PdfDoc = InstanceType<typeof PDFDocument>;

function drawPageBackground(doc: PdfDoc) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
  doc.restore();
}

function drawHeader(doc: PdfDoc, report: WealthIntelligenceReport) {
  const preparedDate = new Date(report.preparedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  doc.save();
  doc.rect(48, 40, doc.page.width - 96, 72).fill(NAVY_PANEL);
  doc.strokeColor(BORDER).lineWidth(1).rect(48, 40, doc.page.width - 96, 72).stroke();
  doc.restore();

  doc.save();
  doc.rect(60, 52, 32, 32).fill(GOLD);
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(18).text("A", 69, 58, { lineBreak: false });
  doc.restore();

  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(14).text("AURELIUS", 100, 54, { lineBreak: false });
  doc.fillColor(MUTED).font("Helvetica").fontSize(8).text("PRIVATE WEALTH INTELLIGENCE", 100, 72, { lineBreak: false });

  doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(18).text("Private Memo", 48, 128);
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(11)
    .text(`Prepared for ${report.preparedFor} · ${preparedDate}`, 48, 152);

  doc.save();
  doc.roundedRect(48, 178, 148, 22, 4).fill(GOLD);
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(8).text("PRIVATE & ENCRYPTED", 58, 185, { lineBreak: false });
  doc.restore();

  if (report.summaryLine) {
    doc.moveDown(2.2);
    doc.fillColor(TEXT).font("Helvetica").fontSize(11).text(report.summaryLine, 48, 212, {
      width: doc.page.width - 96,
      align: "left",
    });
  }
}

function drawRecommendation(
  doc: PdfDoc,
  rec: WealthIntelligenceReport["recommendations"][number],
  index: number,
) {
  const y = doc.y;
  if (y > doc.page.height - 160) {
    doc.addPage();
    drawPageBackground(doc);
    doc.y = 48;
  }

  const startY = doc.y + 8;
  doc.save();
  doc.roundedRect(48, startY, doc.page.width - 96, 4, 2).fill(GOLD);
  doc.restore();

  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(8).text(categoryBadgeLabel(rec.category), 48, startY + 14);
  doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(13).text(rec.title, 48, startY + 28, {
    width: doc.page.width - 96,
  });

  const titleHeight = doc.heightOfString(rec.title, { width: doc.page.width - 96 });
  let cursorY = startY + 28 + titleHeight + 10;

  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8).text("WHAT TO DO", 48, cursorY);
  cursorY += 14;
  doc.fillColor(TEXT).font("Helvetica").fontSize(10).text(rec.whatToDo, 48, cursorY, {
    width: doc.page.width - 96,
  });
  cursorY += doc.heightOfString(rec.whatToDo, { width: doc.page.width - 96 }) + 12;

  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8).text("WHY", 48, cursorY);
  cursorY += 14;
  doc.fillColor(MUTED).font("Helvetica").fontSize(10).text(rec.why, 48, cursorY, {
    width: doc.page.width - 96,
  });
  cursorY += doc.heightOfString(rec.why, { width: doc.page.width - 96 }) + 10;

  if (rec.estimatedBenefitInr != null || rec.estimatedBenefitLabel) {
    const benefit =
      rec.estimatedBenefitInr != null
        ? `Estimated benefit: ${formatInr(rec.estimatedBenefitInr)}${rec.estimatedBenefitLabel ? ` (${rec.estimatedBenefitLabel})` : ""}`
        : `Estimated benefit: ${rec.estimatedBenefitLabel}`;
    doc.fillColor(GOLD_LIGHT).font("Helvetica-Bold").fontSize(10).text(benefit, 48, cursorY, {
      width: doc.page.width - 96,
    });
    cursorY += 18;
  }

  doc.y = cursorY + (index < 0 ? 0 : 12);
}

function drawFooter(doc: PdfDoc, name: string) {
  const footerY = doc.page.height - 48;
  doc.strokeColor(BORDER).lineWidth(0.5).moveTo(48, footerY - 12).lineTo(doc.page.width - 48, footerY - 12).stroke();
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(8)
    .text(`Confidential — Aurelius Private. For ${name} only.`, 48, footerY, {
      width: doc.page.width - 96,
      align: "center",
    });
}

export async function buildIntelligenceBriefPdf(report: WealthIntelligenceReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawPageBackground(doc);
    drawHeader(doc, report);

    doc.y = report.summaryLine ? 250 : 220;

    report.recommendations.forEach((rec, index) => {
      drawRecommendation(doc, rec, index);
    });

    drawFooter(doc, report.preparedFor);
    doc.end();
  });
}

export { briefPdfFileName };
