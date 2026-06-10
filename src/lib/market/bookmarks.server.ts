import { mutateVaultStore } from "@/lib/vault/store.server";

export async function saveIntelligenceBookmark(
  email: string,
  input: { name: string; content: string; type: "article" | "brief"; url?: string },
): Promise<void> {
  const now = new Date().toISOString();
  await mutateVaultStore((store) => {
    store.documents.unshift({
      id: `intel-${crypto.randomUUID()}`,
      memberEmail: email.toLowerCase(),
      name: input.name,
      category: "Intelligence",
      mimeType: "text/plain",
      sizeBytes: input.content.length,
      uploadedAt: now,
      status: "indexed",
      indexedText: input.content,
      searchKeywords: ["saved intelligence", input.type, input.url ?? ""].filter(Boolean),
    });
  });
}
