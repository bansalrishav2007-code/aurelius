import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { DocumentCategory, VaultDocument, VaultStore } from "./types";

const DATA_PATH = join(process.cwd(), ".data", "aureliuss-vault.json");
const FILES_DIR = join(process.cwd(), ".data", "vault-files");

function defaultStore(): VaultStore {
  return { documents: [] };
}

let memoryStore: VaultStore | null = null;

async function ensureStore(): Promise<void> {
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await mkdir(FILES_DIR, { recursive: true });
  try {
    await readFile(DATA_PATH, "utf-8");
  } catch {
    await writeFile(DATA_PATH, JSON.stringify(defaultStore(), null, 2), "utf-8");
  }
}

export async function readVaultStore(): Promise<VaultStore> {
  if (memoryStore) return structuredClone(memoryStore);
  await ensureStore();
  try {
    const raw = await readFile(DATA_PATH, "utf-8");
    memoryStore = JSON.parse(raw) as VaultStore;
    return structuredClone(memoryStore);
  } catch {
    const fresh = defaultStore();
    await writeVaultStore(fresh);
    return structuredClone(fresh);
  }
}

export async function writeVaultStore(store: VaultStore): Promise<void> {
  memoryStore = structuredClone(store);
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function mutateVaultStore<T>(fn: (store: VaultStore) => T | Promise<T>): Promise<T> {
  const store = await readVaultStore();
  const result = await fn(store);
  await writeVaultStore(store);
  return result;
}

export function inferCategory(filename: string): DocumentCategory {
  const lower = filename.toLowerCase();
  if (lower.includes("itr") || lower.includes("income")) return "ITR";
  if (lower.includes("form16") || lower.includes("form_16") || lower.includes("form-16")) return "Form 16";
  if (lower.includes("gst")) return "GST";
  if (lower.includes("balance") || lower.includes("financial") || lower.includes("p&l")) return "Financials";
  if (lower.includes("property") || lower.includes("deed") || lower.includes("sale")) return "Property";
  if (lower.includes("trust") || lower.includes("legal") || lower.includes("agreement")) return "Legal";
  if (lower.includes("15ca") || lower.includes("15cb") || lower.includes("remittance")) return "Remittance";
  if (lower.includes("capital") || lower.includes("portfolio") || lower.includes("demat")) return "Investments";
  return "Other";
}

export function filePathFor(documentId: string): string {
  return join(FILES_DIR, `${documentId}.pdf`);
}

export async function saveDocumentFile(documentId: string, data: Buffer): Promise<void> {
  await mkdir(FILES_DIR, { recursive: true });
  await writeFile(filePathFor(documentId), data);
}

export async function deleteDocumentFile(documentId: string): Promise<void> {
  try {
    await unlink(filePathFor(documentId));
  } catch {
    // file may not exist
  }
}

export async function listMemberDocuments(email: string): Promise<VaultDocument[]> {
  const store = await readVaultStore();
  return store.documents.filter((d) => d.memberEmail === email.toLowerCase());
}

export async function addDocument(opts: {
  memberEmail: string;
  name: string;
  category?: DocumentCategory;
  sizeBytes: number;
  mimeType: string;
  fileBuffer: Buffer;
}): Promise<VaultDocument> {
  const id = `doc-${crypto.randomUUID()}`;
  await saveDocumentFile(id, opts.fileBuffer);

  const doc: VaultDocument = {
    id,
    memberEmail: opts.memberEmail.toLowerCase(),
    name: opts.name,
    category: opts.category ?? inferCategory(opts.name),
    sizeBytes: opts.sizeBytes,
    mimeType: opts.mimeType,
    uploadedAt: new Date().toISOString(),
    status: "received",
  };

  await mutateVaultStore((store) => {
    store.documents.unshift(doc);
    return doc;
  });

  return doc;
}

export async function getDocument(id: string, memberEmail: string): Promise<VaultDocument | undefined> {
  const store = await readVaultStore();
  return store.documents.find((d) => d.id === id && d.memberEmail === memberEmail.toLowerCase());
}

export async function updateDocument(
  id: string,
  memberEmail: string,
  patch: Partial<Pick<VaultDocument, "category" | "status" | "analysis">>,
): Promise<boolean> {
  return mutateVaultStore((store) => {
    const doc = store.documents.find((d) => d.id === id && d.memberEmail === memberEmail.toLowerCase());
    if (!doc) return false;
    Object.assign(doc, patch);
    return true;
  });
}

export async function deleteDocument(id: string, memberEmail: string): Promise<boolean> {
  const removed = await mutateVaultStore((store) => {
    const idx = store.documents.findIndex((d) => d.id === id && d.memberEmail === memberEmail.toLowerCase());
    if (idx === -1) return false;
    store.documents.splice(idx, 1);
    return true;
  });
  if (removed) await deleteDocumentFile(id);
  return removed;
}
