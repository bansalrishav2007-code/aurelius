import { buildClientWealthBriefForExpert } from "./brief.server";
import type { ExpertClientRelation } from "./types";

type StoreAccessor = {
  read: () => Promise<{
    clientRelations: ExpertClientRelation[];
    chatThreads: import("./types").ExpertChatThread[];
  }>;
  mutate: <T>(fn: (store: {
    clientRelations: ExpertClientRelation[];
    chatThreads: import("./types").ExpertChatThread[];
  }) => T) => Promise<T>;
};

let storeAccessor: StoreAccessor | null = null;

export function wireRelationsStore(accessor: StoreAccessor) {
  storeAccessor = accessor;
}

function getStore() {
  if (!storeAccessor) throw new Error("Expert relations store not wired.");
  return storeAccessor;
}

export async function getOrCreateRelation(input: {
  expertId: string;
  memberEmail: string;
  memberName: string;
}): Promise<ExpertClientRelation> {
  const email = input.memberEmail.toLowerCase();
  return getStore().mutate((store) => {
    let rel = store.clientRelations.find(
      (r) => r.expertId === input.expertId && r.memberEmail === email,
    );
    if (!rel) {
      const now = new Date().toISOString();
      rel = {
        id: `rel-${crypto.randomUUID()}`,
        expertId: input.expertId,
        memberEmail: email,
        memberName: input.memberName,
        vaultShareApproved: false,
        ndaSignedByExpert: false,
        createdAt: now,
        updatedAt: now,
      };
      store.clientRelations.push(rel);
    }
    return structuredClone(rel);
  });
}

export async function approveVaultSharing(input: {
  expertId: string;
  memberEmail: string;
  memberName: string;
  mainConcern?: string;
}): Promise<ExpertClientRelation> {
  const email = input.memberEmail.toLowerCase();
  const brief = await buildClientWealthBriefForExpert(email, input.mainConcern);

  await getStore().mutate((store) => {
    let thread = store.chatThreads.find(
      (t) => t.expertId === input.expertId && t.memberEmail === email,
    );
    const now = new Date().toISOString();
    if (!thread) {
      store.chatThreads.push({
        id: `exchat-${crypto.randomUUID()}`,
        expertId: input.expertId,
        memberEmail: email,
        memberName: input.memberName,
        messages: [],
        wealthBriefForExpert: brief,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      thread.wealthBriefForExpert = brief;
      thread.updatedAt = now;
    }
    return null;
  });

  return getStore().mutate((store) => {
    let rel = store.clientRelations.find(
      (r) => r.expertId === input.expertId && r.memberEmail === email,
    );
    const now = new Date().toISOString();
    if (!rel) {
      rel = {
        id: `rel-${crypto.randomUUID()}`,
        expertId: input.expertId,
        memberEmail: email,
        memberName: input.memberName,
        vaultShareApproved: true,
        vaultShareApprovedAt: now,
        mainConcern: input.mainConcern,
        ndaSignedByExpert: false,
        createdAt: now,
        updatedAt: now,
      };
      store.clientRelations.push(rel);
    } else {
      rel.vaultShareApproved = true;
      rel.vaultShareApprovedAt = now;
      rel.mainConcern = input.mainConcern ?? rel.mainConcern;
      rel.updatedAt = now;
    }
    return structuredClone(rel!);
  });
}

export async function listExpertClients(expertId: string): Promise<
  (ExpertClientRelation & { brief?: string })[]
> {
  const store = await getStore().read();
  const threads = store.chatThreads.filter((t) => t.expertId === expertId);
  return store.clientRelations
    .filter((r) => r.expertId === expertId)
    .map((r) => ({
      ...r,
      brief: r.vaultShareApproved
        ? threads.find((t) => t.memberEmail === r.memberEmail)?.wealthBriefForExpert
        : undefined,
    }));
}

export async function getRelationForExpert(
  expertId: string,
  memberEmail: string,
): Promise<ExpertClientRelation | null> {
  const store = await getStore().read();
  return (
    store.clientRelations.find(
      (r) => r.expertId === expertId && r.memberEmail === memberEmail.toLowerCase(),
    ) ?? null
  );
}
