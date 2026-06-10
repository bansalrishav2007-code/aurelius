import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { SupportStore, SupportTicket } from "./types";

import { resolveDataFile } from "@/lib/data-path.server";

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-support.json", "aureliuss-support.json");
  return dataPathPromise;
}
let memoryStore: SupportStore | null = null;

async function ensureStore(): Promise<void> {
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  try {
    await readFile(DATA_PATH, "utf-8");
  } catch {
    await writeFile(DATA_PATH, JSON.stringify({ tickets: [] }, null, 2), "utf-8");
  }
}

export async function readSupportStore(): Promise<SupportStore> {
  if (memoryStore) return structuredClone(memoryStore);
  await ensureStore();
  const DATA_PATH = await getDataPath();
  try {
    const parsed = JSON.parse(await readFile(DATA_PATH, "utf-8")) as SupportStore;
    memoryStore = parsed;
    return structuredClone(parsed);
  } catch {
    const fresh = { tickets: [] };
    await writeSupportStore(fresh);
    return structuredClone(fresh);
  }
}

export async function writeSupportStore(store: SupportStore): Promise<void> {
  memoryStore = structuredClone(store);
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function mutateSupportStore<T>(fn: (store: SupportStore) => T | Promise<T>): Promise<T> {
  const store = await readSupportStore();
  const result = await fn(store);
  await writeSupportStore(store);
  return result;
}

export async function createSupportTicket(
  entry: Omit<SupportTicket, "id" | "status" | "createdAt" | "replies">,
): Promise<SupportTicket> {
  return mutateSupportStore((store) => {
    const ticket: SupportTicket = {
      ...entry,
      id: `tkt-${crypto.randomUUID()}`,
      status: "open",
      createdAt: new Date().toISOString(),
      replies: [],
    };
    store.tickets.unshift(ticket);
    return ticket;
  });
}

export async function listSupportTickets(): Promise<SupportTicket[]> {
  const store = await readSupportStore();
  return store.tickets;
}

export async function listMemberSupportTickets(email: string): Promise<SupportTicket[]> {
  const normalized = email.toLowerCase();
  const store = await readSupportStore();
  return store.tickets.filter((t) => t.email === normalized);
}

export async function replyToTicket(
  ticketId: string,
  message: string,
): Promise<SupportTicket | null> {
  return mutateSupportStore((store) => {
    const ticket = store.tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;
    ticket.replies.push({ from: "founder", message, at: new Date().toISOString() });
    return { ...ticket };
  });
}

export async function setTicketStatus(
  ticketId: string,
  status: SupportTicket["status"],
): Promise<SupportTicket | null> {
  return mutateSupportStore((store) => {
    const ticket = store.tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;
    ticket.status = status;
    ticket.resolvedAt = status === "resolved" ? new Date().toISOString() : undefined;
    return { ...ticket };
  });
}
