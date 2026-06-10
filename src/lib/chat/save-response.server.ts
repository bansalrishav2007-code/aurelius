import PDFDocument from "pdfkit";
import { addDocument } from "@/lib/vault/store.server";

export async function saveAdvisorResponseToVault(memberEmail: string, title: string, content: string) {
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(16).text("Aurelius AI Advisor", { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(title, { continued: false });
    doc.moveDown();
    doc.fontSize(10).text(content, { align: "left" });
    doc.end();
  });

  const name = `AI_Advisor_${title.slice(0, 40).replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  return addDocument({
    memberEmail,
    name,
    category: "Intelligence",
    sizeBytes: buffer.length,
    mimeType: "application/pdf",
    fileBuffer: buffer,
  });
}
