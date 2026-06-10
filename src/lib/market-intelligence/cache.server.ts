import type { MarketIntelligencePayload } from "./types";

const TTL_MS = 55 * 1000;

let cache: { payload: MarketIntelligencePayload; expiresAt: number } | null = null;
let inflight: Promise<MarketIntelligencePayload> | null = null;

export function getCachedMarketIntelligence(): MarketIntelligencePayload | null {
  if (!cache || Date.now() > cache.expiresAt) return null;
  return { ...cache.payload, source: "cache" };
}

export async function getMarketIntelligence(
  loader: () => Promise<MarketIntelligencePayload>,
): Promise<MarketIntelligencePayload> {
  const cached = getCachedMarketIntelligence();
  if (cached) return cached;

  if (!inflight) {
    inflight = loader()
      .then((payload) => {
        cache = { payload, expiresAt: Date.now() + TTL_MS };
        return payload;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}
