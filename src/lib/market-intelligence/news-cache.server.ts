import type { NewsPayload } from "./types";

const TTL_MS = 15 * 60 * 1000;

let cache: { payload: NewsPayload; expiresAt: number } | null = null;
let inflight: Promise<NewsPayload> | null = null;

export function clearNewsCache(): void {
  cache = null;
  inflight = null;
}

export function getCachedNews(): NewsPayload | null {
  if (!cache || Date.now() > cache.expiresAt) return null;
  return { ...cache.payload, source: "cache" };
}

export function peekNewsCache(): NewsPayload | null {
  return cache?.payload ?? null;
}

export async function getNewsWithCache(loader: () => Promise<NewsPayload>): Promise<NewsPayload> {
  const cached = getCachedNews();
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
