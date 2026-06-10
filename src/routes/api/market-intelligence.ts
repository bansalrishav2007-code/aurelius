import { createFileRoute } from "@tanstack/react-router";
import { getMarketIntelligence } from "@/lib/market-intelligence/cache.server";
import { getMarketTickerItems } from "@/lib/market-intelligence/ticker.server";
import type { MarketIntelligencePayload } from "@/lib/market-intelligence/types";

async function loadTicker(): Promise<MarketIntelligencePayload> {
  const { items, liveIndices, marketSession } = await getMarketTickerItems();
  return {
    ticker: items,
    fetchedAt: new Date().toISOString(),
    liveIndices,
    marketSession,
  };
}

export const Route = createFileRoute("/api/market-intelligence")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const payload = await getMarketIntelligence(loadTicker);
          return Response.json(payload, {
            headers: {
              "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
            },
          });
        } catch (err) {
          console.error("[Aurelius] GET /api/market-intelligence error", err);
          return Response.json({ error: "Unable to load market ticker." }, { status: 503 });
        }
      },
    },
  },
});
