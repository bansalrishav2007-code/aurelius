import { readVaultStore } from "@/lib/vault/store.server";

export type RetrievedChunk = {
  text: string;
  source: string;
};

export async function retrieveContext(
  _query: string,
  documentIds: string[],
  memberEmail: string,
): Promise<RetrievedChunk[]> {
  if (!documentIds.length) return [];

  const store = await readVaultStore();
  const chunks: RetrievedChunk[] = [];
  const normalized = memberEmail.toLowerCase();

  for (const id of documentIds) {
    const doc = store.documents.find((d) => d.id === id && d.memberEmail === normalized);
    if (!doc) continue;

    if (doc.analysis) {
      const a = doc.analysis;
      chunks.push({
        source: doc.name,
        text: [
          `Category: ${doc.category}`,
          `Summary: ${a.summary}`,
          `Plain English: ${a.plainEnglish}`,
          a.keyFacts.length ? `Key facts: ${a.keyFacts.join("; ")}` : "",
          a.complianceConcerns.length ? `Compliance: ${a.complianceConcerns.join("; ")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      });
    } else {
      chunks.push({
        source: doc.name,
        text: `Vault document "${doc.name}" (${doc.category}, uploaded ${new Date(doc.uploadedAt).toLocaleDateString("en-IN")}). Analysis not yet run — reference filename and category only.`,
      });
    }
  }

  return chunks;
}
