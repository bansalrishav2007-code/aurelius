// RAG retriever — server-only.
//
// This is the architectural seam for retrieval-augmented generation. Today
// it returns mocked excerpts from the in-memory document store so the chat
// can demonstrate citation behaviour. To go live:
//
//   1. Replace `mockChunks` with a pgvector-backed table (`document_chunks`
//      with a `vector(3072)` embedding column — see Lovable AI Embeddings).
//   2. Embed `query` via `/v1/embeddings` (model: `google/gemini-embedding-001`).
//   3. Run `match_documents(query_embedding, 5)` and return the rows.
//
// The signature is intentionally stable so the chat route never has to change.

export interface RetrievedChunk {
  source: string;
  text: string;
  score: number;
}

interface ChunkRecord {
  documentId: string;
  source: string;
  text: string;
  keywords: string[];
}

// Mock corpus — mirrors the documents shown in the Secure Vault.
const mockChunks: ChunkRecord[] = [
  {
    documentId: "doc-itr-fy24",
    source: "ITR-2 FY 2023-24.pdf",
    text:
      "Gross total income ₹4.82 Cr. LTCG on listed equities ₹1.94 Cr taxed at 10% u/s 112A (grandfathered cost basis). Foreign assets disclosed under Schedule FA. Self-occupied property loss set off ₹1.5L.",
    keywords: ["itr", "ltcg", "112a", "foreign", "schedule fa"],
  },
  {
    documentId: "doc-form-16",
    source: "Form 16 — FY 2023-24.pdf",
    text:
      "Salary ₹2.40 Cr from Aurum Capital Advisors LLP. TDS ₹74.2L deducted u/s 192. Perquisites incl. ESOP ₹38L valued at FMV per Rule 3(8).",
    keywords: ["form 16", "salary", "tds", "esop", "perquisites"],
  },
  {
    documentId: "doc-cap-gains",
    source: "Capital Gains Statement — Zerodha.csv",
    text:
      "STCG realised ₹62.4L (avg holding 142 days). LTCG realised ₹1.94 Cr. Unrealised short-term loss ₹42L from March 2024 correction available for set-off.",
    keywords: ["capital gains", "stcg", "ltcg", "harvesting"],
  },
  {
    documentId: "doc-trust-deed",
    source: "Sharma Family Private Trust — Deed.pdf",
    text:
      "Discretionary trust settled 12 March 2019. Settlor Mr. Rohan Sharma. Beneficiaries: spouse and two children. Trustee: ICICI Trusteeship Services. Specified beneficiaries clause invoked — taxed at MMR per § 164(1).",
    keywords: ["trust", "discretionary", "164", "succession", "family"],
  },
];

export async function retrieveContext(
  query: string,
  documentIds: string[],
): Promise<RetrievedChunk[]> {
  const scoped = documentIds.length
    ? mockChunks.filter((c) => documentIds.includes(c.documentId))
    : mockChunks;

  const q = query.toLowerCase();
  const scored = scoped
    .map((chunk) => {
      const score = chunk.keywords.reduce(
        (acc, kw) => acc + (q.includes(kw) ? 1 : 0),
        0,
      );
      return { chunk, score };
    })
    .filter((s) => s.score > 0 || documentIds.includes(s.chunk.documentId))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return scored.map(({ chunk, score }) => ({
    source: chunk.source,
    text: chunk.text,
    score,
  }));
}
