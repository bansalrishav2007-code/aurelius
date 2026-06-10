import type { MarketIntelligencePayload, MarketTickerItem } from "@/lib/market-intelligence/types";

const REFRESH_MS = 60_000;

export type MarketDataSnapshot = MarketIntelligencePayload & {
  loading: boolean;
  error?: string;
};

type Listener = (snapshot: MarketDataSnapshot) => void;

let snapshot: MarketDataSnapshot = {
  ticker: [],
  fetchedAt: "",
  liveIndices: false,
  marketSession: { status: "closed", label: "MARKET CLOSED", detail: "Last Close" },
  loading: true,
};

let listeners = new Set<Listener>();
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let inflight: Promise<void> | null = null;

function notify() {
  for (const listener of listeners) listener(snapshot);
}

async function fetchTickerPayload(): Promise<MarketIntelligencePayload | null> {
  const res = await fetch("/api/market-intelligence", { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as MarketIntelligencePayload;
}

export async function refreshAll(): Promise<MarketDataSnapshot> {
  if (!inflight) {
    inflight = (async () => {
      snapshot = { ...snapshot, loading: true };
      notify();

      try {
        const payload = await fetchTickerPayload();
        if (!payload) {
          snapshot = {
            ...snapshot,
            loading: false,
            error: "Data unavailable",
            ticker: [],
          };
        } else {
          snapshot = {
            ...payload,
            loading: false,
            error: undefined,
          };
        }
      } catch {
        snapshot = {
          ...snapshot,
          loading: false,
          error: "Data unavailable",
          ticker: [],
        };
      } finally {
        notify();
        inflight = null;
      }
    })();
  }

  await inflight;
  return snapshot;
}

export function getMarketSnapshot(): MarketDataSnapshot {
  return snapshot;
}

export function subscribeMarketData(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

export function startMarketAutoRefresh(): () => void {
  void refreshAll();
  if (!refreshTimer) {
    refreshTimer = setInterval(() => {
      void refreshAll();
    }, REFRESH_MS);
  }
  return stopMarketAutoRefresh;
}

export function stopMarketAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

export function hasLiveTickerData(items: MarketTickerItem[]): boolean {
  return items.some((item) => !item.unavailable);
}

/** @deprecated Use refreshAll — kept for API parity with requested service shape */
export async function fetchNifty(): Promise<MarketTickerItem | null> {
  const data = await refreshAll();
  return data.ticker.find((item) => item.symbol === "NIFTY 50") ?? null;
}

/** @deprecated Use refreshAll */
export async function fetchSensex(): Promise<MarketTickerItem | null> {
  const data = await refreshAll();
  return data.ticker.find((item) => item.symbol === "SENSEX") ?? null;
}

/** @deprecated Use refreshAll */
export async function fetchGold(): Promise<MarketTickerItem | null> {
  const data = await refreshAll();
  return data.ticker.find((item) => item.symbol === "GOLD") ?? null;
}

/** @deprecated Use refreshAll */
export async function fetchUSDINR(): Promise<MarketTickerItem | null> {
  const data = await refreshAll();
  return data.ticker.find((item) => item.symbol === "USD/INR") ?? null;
}
