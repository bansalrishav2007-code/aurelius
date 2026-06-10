import { addDocument, saveDocumentFile, updateDocument } from "@/lib/vault/store.server";
import { briefPdfFileName } from "./colors";
import { buildIntelligenceBriefPdf } from "./intelligence-pdf.server";
import { getOrCreateProfile, saveProfile } from "./store.server";

export async function exportIntelligenceBriefPdf(
  email: string,
): Promise<{ buffer: Buffer; fileName: string; vaultDocumentId: string } | { error: string }> {
  const profile = await getOrCreateProfile(email);
  const report = profile.intelligenceReport;

  if (!report || report.status !== "ready") {
    return { error: "Intelligence brief is not ready yet." };
  }

  const buffer = await buildIntelligenceBriefPdf(report);
  const fileName = briefPdfFileName(new Date(report.preparedAt));

  if (report.vaultDocumentId) {
    await saveDocumentFile(report.vaultDocumentId, buffer);
    await updateDocument(report.vaultDocumentId, email, { status: "received" });
  } else {
    const vaultDoc = await addDocument({
      memberEmail: email,
      name: fileName,
      category: "Intelligence",
      sizeBytes: buffer.length,
      mimeType: "application/pdf",
      fileBuffer: buffer,
    });
    report.vaultDocumentId = vaultDoc.id;
  }

  report.pdfFileName = fileName;
  profile.intelligenceReport = report;
  await saveProfile(profile);

  return {
    buffer,
    fileName,
    vaultDocumentId: report.vaultDocumentId,
  };
}
