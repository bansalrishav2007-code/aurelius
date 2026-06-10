import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { DocumentCategory, VaultDocument, VaultStore } from "./types";
import { resolveDataFile } from "@/lib/data-path.server";

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-vault.json", "aureliuss-vault.json");
  return dataPathPromise;
}
const FILES_DIR = join(process.cwd(), ".data", "vault-files");

function defaultStore(): VaultStore {
  return { documents: [] };
}

let memoryStore: VaultStore | null = null;

async function ensureStore(): Promise<void> {
  const DATA_PATH = await getDataPath();
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
  const DATA_PATH = await getDataPath();
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
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function mutateVaultStore<T>(fn: (store: VaultStore) => T | Promise<T>): Promise<T> {
  const store = await readVaultStore();
  const result = await fn(store);
  await writeVaultStore(store);
  return result;
}

export function fileExtFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "pdf";
  return name.slice(dot + 1).toLowerCase() || "pdf";
}

export function inferCategory(filename: string): DocumentCategory {
  const lower = filename.toLowerCase();
  if (lower.includes("will") || lower.includes("testament") || lower.includes("succession")) return "Will & Succession";
  if (lower.includes("insurance") || lower.includes("policy")) return "Insurance Policy";
  if (lower.includes("passport")) return "Other";
  if (lower.includes("bank") && lower.includes("statement")) return "Bank Statements";
  if (lower.includes("share") || lower.includes("certificate") || lower.includes("demat")) return "Investment Statement";
  if (lower.includes("company") || lower.includes("moa") || lower.includes("aoa") || lower.includes("incorporation")) {
    return "Company Documents";
  }
  if (lower.includes("ca ") || lower.includes("chartered") || lower.includes("audit letter")) return "Legal Agreement";
  if (lower.includes("itr") || lower.includes("income tax return")) return "ITR";
  if (lower.includes("form16") || lower.includes("form_16") || lower.includes("form-16")) return "Tax Returns";
  if (lower.includes("gst") || lower.includes("gstr")) return "GST";
  if (lower.includes("tax return") || lower.includes("tax")) return "Tax Returns";
  if (lower.includes("balance") || lower.includes("financial") || lower.includes("p&l")) return "Company Documents";
  if (lower.includes("property") || lower.includes("deed") || lower.includes("sale")) return "Property Document";
  if (lower.includes("trust") || lower.includes("legal") || lower.includes("agreement")) return "Legal Agreement";
  if (lower.includes("15ca") || lower.includes("15cb") || lower.includes("remittance")) return "Legal Agreement";
  if (lower.includes("capital") || lower.includes("portfolio") || lower.includes("investment")) return "Investment Statement";
  if (lower.includes("brief") || lower.includes("intelligence") || lower.includes("market intel")) return "Intelligence";
  return "Other";
}

export function inferExpiry(filename: string): { expiryDate?: string; expiryType?: import("./types").ExpiryType } {
  const lower = filename.toLowerCase();
  if (lower.includes("insurance") || lower.includes("policy")) {
    const yearMatch = lower.match(/20\d{2}/);
    const base = yearMatch ? new Date(`${yearMatch[0]}-12-31`) : new Date();
    base.setFullYear(base.getFullYear() + 1);
    return { expiryDate: base.toISOString().slice(0, 10), expiryType: "insurance" };
  }
  if (lower.includes("passport")) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 10);
    return { expiryDate: d.toISOString().slice(0, 10), expiryType: "passport" };
  }
  if (lower.includes("property") && lower.includes("tax")) {
    const d = new Date();
    d.setMonth(2, 31);
    if (d < new Date()) d.setFullYear(d.getFullYear() + 1);
    return { expiryDate: d.toISOString().slice(0, 10), expiryType: "property_tax" };
  }
  return {};
}

export function buildSearchKeywords(filename: string, category: DocumentCategory): string[] {
  const parts = filename
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .split(/[\s_\-./]+/)
    .filter((p) => p.length > 2);
  return [...new Set([category.toLowerCase(), ...parts])];
}

export function filePathFor(documentId: string, filenameOrExt?: string): string {
  const ext = filenameOrExt
    ? filenameOrExt.includes(".")
      ? fileExtFromName(filenameOrExt)
      : filenameOrExt
    : "pdf";
  return join(FILES_DIR, `${documentId}.${ext}`);
}

export async function readDocumentFile(doc: Pick<VaultDocument, "id" | "name">): Promise<Buffer> {
  const ext = fileExtFromName(doc.name);
  const primary = filePathFor(doc.id, ext);
  try {
    return await readFile(primary);
  } catch {
    return await readFile(filePathFor(doc.id, "pdf"));
  }
}

export async function saveDocumentFile(
  documentId: string,
  data: Buffer,
  filenameOrExt?: string,
): Promise<void> {
  await mkdir(FILES_DIR, { recursive: true });
  await writeFile(filePathFor(documentId, filenameOrExt), data);
}

export async function deleteDocumentFile(doc: Pick<VaultDocument, "id" | "name">): Promise<void> {
  const paths = [
    filePathFor(doc.id, doc.name),
    filePathFor(doc.id, "pdf"),
  ];
  for (const path of paths) {
    try {
      await unlink(path);
    } catch {
      /* file may not exist */
    }
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
  const category = opts.category ?? inferCategory(opts.name);
  const expiry = inferExpiry(opts.name);
  const email = opts.memberEmail.toLowerCase();
  const store = await readVaultStore();

  const existing = store.documents.find(
    (d) => d.memberEmail === email && d.name.toLowerCase() === opts.name.toLowerCase(),
  );

  if (existing) {
    const version: import("./types").DocumentVersion = {
      id: existing.id,
      name: existing.name,
      uploadedAt: existing.uploadedAt,
      sizeBytes: existing.sizeBytes,
    };
    existing.versions = [version, ...(existing.versions ?? [])].slice(0, 10);
    await saveDocumentFile(existing.id, opts.fileBuffer, opts.name);
    existing.sizeBytes = opts.sizeBytes;
    existing.uploadedAt = new Date().toISOString();
    existing.category = category;
    existing.searchKeywords = buildSearchKeywords(opts.name, category);
    if (expiry.expiryDate) {
      existing.expiryDate = expiry.expiryDate;
      existing.expiryType = expiry.expiryType;
    }
    await writeVaultStore(store);
    return { ...existing };
  }

  const id = `doc-${crypto.randomUUID()}`;
  await saveDocumentFile(id, opts.fileBuffer, opts.name);
  const doc: VaultDocument = {
    id,
    memberEmail: email,
    name: opts.name,
    category,
    sizeBytes: opts.sizeBytes,
    mimeType: opts.mimeType,
    uploadedAt: new Date().toISOString(),
    status: "received",
    searchKeywords: buildSearchKeywords(opts.name, category),
    ...expiry,
  };
  store.documents.unshift(doc);
  await writeVaultStore(store);
  return doc;
}

export async function getDocument(id: string, memberEmail: string): Promise<VaultDocument | undefined> {
  const store = await readVaultStore();
  return store.documents.find((d) => d.id === id && d.memberEmail === memberEmail.toLowerCase());
}

export async function deleteDocuments(
  ids: string[],
  memberEmail: string,
): Promise<{ deleted: string[]; failed: string[] }> {
  const deleted: string[] = [];
  const failed: string[] = [];
  for (const id of ids) {
    const ok = await deleteDocument(id, memberEmail);
    if (ok) deleted.push(id);
    else failed.push(id);
  }
  return { deleted, failed };
}

export async function updateDocument(
  id: string,
  memberEmail: string,
  patch: Partial<
    Pick<
      VaultDocument,
      "category" | "status" | "analysis" | "indexedText" | "expiryDate" | "expiryType" | "activeShareLink"
    >
  >,
): Promise<boolean> {
  return mutateVaultStore((store) => {
    const doc = store.documents.find((d) => d.id === id && d.memberEmail === memberEmail.toLowerCase());
    if (!doc) return false;
    Object.assign(doc, patch);
    return true;
  });
}

export async function deleteDocument(id: string, memberEmail: string): Promise<boolean> {
  let removedDoc: VaultDocument | null = null;
  const removed = await mutateVaultStore((store) => {
    const idx = store.documents.findIndex((d) => d.id === id && d.memberEmail === memberEmail.toLowerCase());
    if (idx === -1) return false;
    removedDoc = { ...store.documents[idx]! };
    store.documents.splice(idx, 1);
    return true;
  });
  if (removed && removedDoc) await deleteDocumentFile(removedDoc);
  return removed;
}
