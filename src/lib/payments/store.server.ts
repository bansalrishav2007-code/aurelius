import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { PaymentRecord, PaymentStore } from "./types";
import { SUBSCRIPTION_PLANS } from "./razorpay.server";

import { resolveDataFile } from "@/lib/data-path.server";

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-payments.json", "aureliuss-payments.json");
  return dataPathPromise;
}
let memoryStore: PaymentStore | null = null;

async function ensureStore(): Promise<void> {
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  try {
    await readFile(DATA_PATH, "utf-8");
  } catch {
    await writeFile(DATA_PATH, JSON.stringify({ payments: [] }, null, 2), "utf-8");
  }
}

export async function readPaymentStore(): Promise<PaymentStore> {
  if (memoryStore) return structuredClone(memoryStore);
  await ensureStore();
  const DATA_PATH = await getDataPath();
  try {
    const parsed = JSON.parse(await readFile(DATA_PATH, "utf-8")) as PaymentStore;
    memoryStore = parsed;
    return structuredClone(parsed);
  } catch {
    const fresh = { payments: [] };
    await writePaymentStore(fresh);
    return structuredClone(fresh);
  }
}

export async function writePaymentStore(store: PaymentStore): Promise<void> {
  memoryStore = structuredClone(store);
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function mutatePaymentStore<T>(fn: (store: PaymentStore) => T | Promise<T>): Promise<T> {
  const store = await readPaymentStore();
  const result = await fn(store);
  await writePaymentStore(store);
  return result;
}

export async function recordPayment(entry: {
  memberEmail: string;
  memberName: string;
  planId: string;
  amountPaise: number;
  currency: string;
  orderId: string;
  status?: PaymentRecord["status"];
}): Promise<PaymentRecord> {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === entry.planId);
  return mutatePaymentStore((store) => {
    const existing = store.payments.find((p) => p.orderId === entry.orderId);
    if (existing) {
      if (entry.status) existing.status = entry.status;
      return existing;
    }
    const payment: PaymentRecord = {
      id: `pay-${crypto.randomUUID()}`,
      memberEmail: entry.memberEmail.toLowerCase(),
      memberName: entry.memberName,
      planId: entry.planId,
      planName: plan?.name ?? entry.planId,
      amountPaise: entry.amountPaise,
      currency: entry.currency,
      status: entry.status ?? "pending",
      orderId: entry.orderId,
      createdAt: new Date().toISOString(),
    };
    store.payments.unshift(payment);
    return payment;
  });
}

export async function capturePaymentByOrder(orderId: string, email?: string): Promise<PaymentRecord | null> {
  return mutatePaymentStore((store) => {
    const payment =
      store.payments.find((p) => p.orderId === orderId) ??
      (email ? store.payments.find((p) => p.memberEmail === email.toLowerCase() && p.status === "pending") : undefined);
    if (!payment) return null;
    payment.status = "captured";
    payment.capturedAt = new Date().toISOString();
    return { ...payment };
  });
}

export async function listPayments(): Promise<PaymentRecord[]> {
  const store = await readPaymentStore();
  return store.payments;
}

export function getPaymentSummary(payments: PaymentRecord[]) {
  const captured = payments.filter((p) => p.status === "captured");
  const totalRevenuePaise = captured.reduce((sum, p) => sum + p.amountPaise, 0);
  const activeSubscriptions = captured.length;
  return {
    totalRevenuePaise,
    totalRevenueCr: (totalRevenuePaise / 10_000_000).toFixed(2),
    capturedCount: captured.length,
    pendingCount: payments.filter((p) => p.status === "pending").length,
    failedCount: payments.filter((p) => p.status === "failed").length,
    activeSubscriptions,
  };
}
