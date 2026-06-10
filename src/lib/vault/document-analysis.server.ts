import { buildAureliusAdvisorSystemPrompt } from "@/lib/ai/advisor-prompt.server";
import { createAureliusCompletion } from "@/lib/ai/router.server";
import { extractDocumentText } from "./extract-text.server";
import type { DocumentAnalysis, DocumentAnalysisSections, VaultDocument } from "./types";

const AURELIUS_DOCUMENT_SYSTEM = `You are Aurelius, a private wealth intelligence assistant. The user has uploaded a financial document. Analyze it and provide:
1. Document summary (2-3 sentences on what this document is)
2. Key figures found (amounts, dates, account numbers if present — mask sensitive digits)
3. Wealth implications (what does this mean for the client's financial picture)
4. Action items (what should the client do based on this document)

Keep the tone sophisticated, concise, and advisory. Format as clean sections with these exact headers:

## Document Summary
## Key Figures Found
## Wealth Implications
## Action Items`;

function parseSections(raw: string): DocumentAnalysisSections {
  const pick = (header: string, nextHeader?: string) => {
    const pattern = nextHeader
      ? new RegExp(`## ${header}\\s*([\\s\\S]*?)(?=## ${nextHeader}|$)`, "i")
      : new RegExp(`## ${header}\\s*([\\s\\S]*?)$`, "i");
    const match = raw.match(pattern);
    return match?.[1]?.trim() ?? "";
  };

  return {
    documentSummary: pick("Document Summary", "Key Figures Found"),
    keyFigures: pick("Key Figures Found", "Wealth Implications"),
    wealthImplications: pick("Wealth Implications", "Action Items"),
    actionItems: pick("Action Items"),
  };
}

function sectionsToLegacy(sections: DocumentAnalysisSections): Omit<DocumentAnalysis, "generatedAt"> {
  const actionLines = sections.actionItems
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  const figureLines = sections.keyFigures
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  return {
    summary: sections.documentSummary || "Analysis complete.",
    plainEnglish: sections.wealthImplications || sections.documentSummary,
    complianceConcerns: [],
    discussionPoints: actionLines.length ? actionLines : ["Review with your advisor."],
    keyFacts: figureLines.length ? figureLines : ["See key figures in the analysis panel."],
    sections,
  };
}

export async function analyzeVaultDocument(doc: VaultDocument): Promise<DocumentAnalysis> {
  const extracted = await extractDocumentText(doc);
  const contextBlock = extracted
    ? `Extracted document text (truncated):\n${extracted}`
    : `No extractable text — infer from filename and category only.\nFilename: ${doc.name}\nCategory: ${doc.category}`;

  const userPrompt = `Analyze this private wealth document for an India-based client.

Document name: ${doc.name}
Category: ${doc.category}
File type: ${doc.mimeType}
Size: ${(doc.sizeBytes / 1024).toFixed(1)} KB

${contextBlock}`;

  let raw = "";

  const system =
    buildAureliusAdvisorSystemPrompt({
      clientName: "Principal",
      tier: "principal",
      feature: "document",
    }) + `\n\n${AURELIUS_DOCUMENT_SYSTEM}`;

  try {
    raw = await createAureliusCompletion({
      system,
      messages: [{ role: "user", content: userPrompt }],
      feature: "document",
      memberEmail: doc.memberEmail,
      maxTokens: 2000,
    });
  } catch (err) {
    console.error("[Vault] Document analysis failed:", doc.id, err);
  }

  if (!raw.trim()) {
    return {
      summary: `${doc.name} is securely stored in your vault.`,
      plainEnglish:
        "Aurelius AI document insights are temporarily unavailable.",
      complianceConcerns: [],
      discussionPoints: ["Review this document with your CA or wealth advisor."],
      keyFacts: [
        `Document: ${doc.name}`,
        `Category: ${doc.category}`,
        `Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString("en-IN")}`,
      ],
      generatedAt: new Date().toISOString(),
      sections: {
        documentSummary: `${doc.name} (${doc.category}) is stored and ready for review.`,
        keyFigures: "AI analysis unavailable — add an API key to extract figures automatically.",
        wealthImplications: "Your advisor can interpret this document in context of your full wealth picture.",
        actionItems: "• Review the document manually\n• Retry AI analysis once API keys are configured",
      },
    };
  }

  const sections = parseSections(raw);
  const legacy = sectionsToLegacy(sections);
  return { ...legacy, generatedAt: new Date().toISOString() };
}

export async function askAboutDocument(
  doc: VaultDocument,
  question: string,
  priorAnalysis?: DocumentAnalysis,
): Promise<string> {
  const extracted = await extractDocumentText(doc);
  const analysisContext = priorAnalysis?.sections
    ? `Prior analysis:
Document Summary: ${priorAnalysis.sections.documentSummary}
Key Figures: ${priorAnalysis.sections.keyFigures}
Wealth Implications: ${priorAnalysis.sections.wealthImplications}
Action Items: ${priorAnalysis.sections.actionItems}`
    : priorAnalysis?.summary ?? "";

  const userPrompt = `The client is asking a follow-up question about their uploaded document.

Document: ${doc.name} (${doc.category})
${analysisContext ? `\n${analysisContext}\n` : ""}
${extracted ? `Document text excerpt:\n${extracted.slice(0, 8000)}\n` : ""}
Client question: ${question}

Answer concisely in 2-4 sentences. Mask any sensitive account digits. India-specific where relevant.`;

  try {
    return await createAureliusCompletion({
      system: buildAureliusAdvisorSystemPrompt({
        clientName: "Principal",
        tier: "principal",
        feature: "document",
      }),
      messages: [{ role: "user", content: userPrompt }],
      feature: "document",
      memberEmail: doc.memberEmail,
      maxTokens: 2000,
    });
  } catch (err) {
    console.error("[Vault] Document Q&A failed:", doc.id, err);
  }

  return "AI is temporarily unavailable. Please try again shortly.";
}

export async function askVaultAssistant(
  docs: VaultDocument[],
  question: string,
): Promise<import("./types").VaultAskResult> {
  const indexed = docs.map((d) => {
    const analysis = d.analysis?.sections
      ? `Summary: ${d.analysis.sections.documentSummary}\nKey figures: ${d.analysis.sections.keyFigures}`
      : d.analysis?.summary ?? "";
    const text = d.indexedText?.slice(0, 2000) ?? "";
    return `[${d.id}] ${d.name} (${d.category})${d.expiryDate ? ` expires ${d.expiryDate}` : ""}\n${analysis}\n${text}`;
  });

  const context = indexed.length
    ? indexed.join("\n\n---\n\n")
    : "No documents in vault.";

  const userPrompt = `The client is searching their private document vault.

Available documents:
${context}

Question: ${question}

Answer based only on the documents above. Cite document names in your answer. If not found, say so clearly.
End with a line: CITATIONS: [doc-id-1, doc-id-2] listing relevant document IDs from brackets above, or CITATIONS: none`;

  let raw = "";
  try {
    raw = await createAureliusCompletion({
      system: buildAureliusAdvisorSystemPrompt({
        clientName: "Principal",
        tier: "principal",
        feature: "document",
      }),
      messages: [{ role: "user", content: userPrompt }],
      feature: "document",
      maxTokens: 2000,
    });
  } catch (err) {
    console.error("[Vault] Assistant search failed:", err);
  }

  if (!raw.trim()) {
    const keyword = question.toLowerCase();
    const matches = docs.filter(
      (d) =>
        d.name.toLowerCase().includes(keyword) ||
        d.category.toLowerCase().includes(keyword) ||
        d.searchKeywords?.some((k) => keyword.includes(k)),
    );
    if (matches.length) {
      return {
        answer: `Found ${matches.length} document(s) that may relate to your question: ${matches.map((m) => m.name).join(", ")}. Configure AI keys for detailed answers.`,
        citations: matches.slice(0, 3).map((m) => ({
          documentId: m.id,
          documentName: m.name,
          excerpt: m.analysis?.summary?.slice(0, 120) ?? m.category,
        })),
      };
    }
    return {
      answer: "I could not find relevant documents. Aurelius AI vault search is temporarily unavailable.",
      citations: [],
    };
  }

  const citationsMatch = raw.match(/CITATIONS:\s*(.+)$/im);
  const citationIds =
    citationsMatch?.[1]
      ?.replace(/\[|\]/g, "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "none") ?? [];

  const answer = raw.replace(/\n?CITATIONS:.+$/im, "").trim();
  const citations = citationIds
    .map((id) => {
      const doc = docs.find((d) => d.id === id || d.id.includes(id));
      if (!doc) return null;
      return {
        documentId: doc.id,
        documentName: doc.name,
        excerpt: doc.analysis?.summary?.slice(0, 150) ?? `${doc.category} · ${doc.name}`,
      };
    })
    .filter(Boolean) as import("./types").VaultAskCitation[];

  return { answer, citations };
}
