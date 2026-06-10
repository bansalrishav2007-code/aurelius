import PDFDocument from "pdfkit";
import { addDocument } from "@/lib/vault/store.server";
import type { ChatMessage } from "./conversations.server";

export async function exportConversationToVault(
  memberEmail: string,
  clientName: string,
  messages: ChatMessage[],
) {
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `Aurelius_Chat_${date}.pdf`;

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor("#C9A84C").text("AURELIUS", { align: "center" });
    doc.fontSize(10).fillColor("#666666").text("Private Wealth Intelligence — Confidential Memo", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).fillColor("#000000").text(`Prepared for: ${clientName}`);
    doc.text(`Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`);
    doc.moveDown(1.5);

    for (const msg of messages) {
      const label = msg.role === "user" ? clientName : "Aurelius";
      const time = new Date(msg.createdAt).toLocaleString("en-IN");
      doc.fontSize(9).fillColor("#888888").text(`${label} · ${time}`);
      doc.fontSize(10).fillColor("#111111").text(msg.content, { align: "left" });
      doc.moveDown();
    }

    doc.fontSize(8).fillColor("#999999").text(
      "This memo is confidential and intended solely for the named principal. Not investment advice — consult your Aurelius expert for execution.",
      { align: "center" },
    );
    doc.end();
  });

  return addDocument({
    memberEmail,
    name: fileName,
    category: "Intelligence",
    sizeBytes: buffer.length,
    mimeType: "application/pdf",
    fileBuffer: buffer,
  });
}
