import { mockDocuments } from "@/lib/mock-data";
import type { DocumentCategory, VaultDocument } from "@/lib/vault/types";

const SIZE_BYTES: Record<string, number> = {
  "1": 2_516_582,
  "2": 831_488,
  "3": 1_153_433,
  "4": 655_360,
  "5": 3_984_588,
  "6": 942_080,
};

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function daysFromNowIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function getDemoVaultDocuments(memberEmail: string): VaultDocument[] {
  return mockDocuments.map((doc, index) => ({
    id: `demo-doc-${doc.id}`,
    memberEmail,
    name: doc.name,
    category: doc.category as DocumentCategory,
    sizeBytes: SIZE_BYTES[doc.id] ?? 1_048_576,
    mimeType: "application/pdf",
    uploadedAt: daysAgoIso(index * 4 + 1),
    expiryDate: index === 2 ? daysFromNowIso(14) : index === 4 ? daysFromNowIso(5) : undefined,
    expiryType: index === 2 || index === 4 ? ("insurance" as const) : undefined,
    status: "analyzed" as const,
    analysis: {
      summary: "Sample ITR filing for assessment year 2024–25 with declared income and tax paid.",
      plainEnglish: "This document has been indexed with illustrative insights for the Aurelius demo experience.",
      complianceConcerns: ["Illustrative only — not derived from your documents"],
      discussionPoints: ["Review with your chartered accountant before acting"],
      keyFacts: ["Demo data · upgrade for live vault intelligence"],
      generatedAt: daysAgoIso(index),
      sections: {
        documentSummary:
          "Sample tax return document for demonstration. Shows declared income, deductions, and tax liability for the assessment year.",
        keyFigures: "Total income: ₹***,***,***\nTax paid: ₹**,***,***\nRefund due: ₹*,**,***",
        wealthImplications:
          "Tax efficiency and deduction utilisation directly affect post-tax investable surplus for the coming year.",
        actionItems:
          "• Verify figures against Form 26AS\n• Discuss advance tax planning with your CA\n• Upgrade for live document intelligence",
      },
    },
  }));
}
