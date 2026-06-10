import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";
import { getDocument, readDocumentFile, updateDocument } from "./store.server";
import type { ShareAudience, ShareAccessEntry } from "./types";

type ShareEntry = {
  token: string;
  documentId: string;
  memberEmail: string;
  expiresAt: string;
  createdAt: string;
  audience: ShareAudience;
  viewOnly: boolean;
  usedAt?: string;
  accessLog: ShareAccessEntry[];
};

type ShareStore = { links: ShareEntry[] };

let cache: ShareStore | null = null;

async function readStore(): Promise<ShareStore> {
  if (cache) return structuredClone(cache);
  const path = await resolveDataFile("aurelius-vault-shares.json");
  await mkdir(dirname(path), { recursive: true });
  try {
    cache = JSON.parse(await readFile(path, "utf-8")) as ShareStore;
    return structuredClone(cache);
  } catch {
    const fresh: ShareStore = { links: [] };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: ShareStore): Promise<void> {
  cache = structuredClone(store);
  const path = await resolveDataFile("aurelius-vault-shares.json");
  await writeFile(path, JSON.stringify(store, null, 2), "utf-8");
}

export async function createVaultShareLink(
  memberEmail: string,
  documentId: string,
  audience: ShareAudience = "expert",
) {
  const doc = await getDocument(documentId, memberEmail);
  if (!doc) return null;

  const token = `share-${crypto.randomUUID().replace(/-/g, "")}`;
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const link: ShareEntry = {
    token,
    documentId,
    memberEmail: memberEmail.toLowerCase(),
    expiresAt,
    createdAt,
    audience,
    viewOnly: true,
    accessLog: [],
  };

  const store = await readStore();
  store.links = store.links.filter(
    (l) => !(l.documentId === documentId && l.memberEmail === memberEmail.toLowerCase()),
  );
  store.links.push(link);
  await writeStore(store);

  const shareLink = {
    token,
    expiresAt,
    createdAt,
    audience,
    viewOnly: true,
    accessLog: [] as ShareAccessEntry[],
    url: `/api/vault/share/${token}`,
  };

  await updateDocument(documentId, memberEmail, { activeShareLink: shareLink });

  return shareLink;
}

export async function getShareLinkForDocument(memberEmail: string, documentId: string) {
  const store = await readStore();
  return store.links.find(
    (l) => l.documentId === documentId && l.memberEmail === memberEmail.toLowerCase(),
  );
}

export async function resolveVaultShare(token: string, userAgent?: string) {
  const store = await readStore();
  const link = store.links.find((l) => l.token === token);
  if (!link) return null;
  if (new Date(link.expiresAt).getTime() < Date.now()) return null;
  if (link.usedAt) return null;

  const doc = await getDocument(link.documentId, link.memberEmail);
  if (!doc) return null;

  try {
    const buffer = await readDocumentFile(doc);

    const accessEntry: ShareAccessEntry = {
      accessedAt: new Date().toISOString(),
      audience: link.audience,
      userAgent: userAgent?.slice(0, 200),
    };
    link.accessLog.push(accessEntry);
    link.usedAt = accessEntry.accessedAt;
    await writeStore(store);

    const activeLink = doc.activeShareLink;
    if (activeLink?.token === token) {
      await updateDocument(doc.id, link.memberEmail, {
        activeShareLink: {
          ...activeLink,
          usedAt: link.usedAt,
          accessLog: link.accessLog,
        },
      });
    }

    return { doc, buffer, viewOnly: link.viewOnly, audience: link.audience };
  } catch {
    return null;
  }
}
