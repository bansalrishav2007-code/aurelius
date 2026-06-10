import { createFileRoute } from "@tanstack/react-router";
import { getServerEnv } from "@/lib/env.server";
import { clearNewsCache, getNewsWithCache, peekNewsCache } from "@/lib/market-intelligence/news-cache.server";
import { fetchNewsArticles } from "@/lib/market-intelligence/news.server";
import type { NewsPayload } from "@/lib/market-intelligence/types";

function bustStaleFallbackCache(): void {
  const apiKey = getServerEnv("NEWS_API_KEY");
  if (!apiKey || apiKey === "your_key_here") return;

  const cached = peekNewsCache();
  const isFallback = cached?.articles?.[0]?.id?.startsWith("fallback");

  if (isFallback) clearNewsCache();
}

async function loadNews(): Promise<NewsPayload> {
  const apiKey = getServerEnv("NEWS_API_KEY");
  const result = await fetchNewsArticles(12, apiKey);
  return {
    articles: result.articles,
    fetchedAt: new Date().toISOString(),
    source: result.live ? "live" : "fallback",
    reason: result.reason,
  };
}

export const Route = createFileRoute("/api/news")({
  server: {
    handlers: {
      GET: async () => {
        try {
          bustStaleFallbackCache();
          const payload = await getNewsWithCache(loadNews);
          return Response.json(payload, {
            headers: {
              "Cache-Control": "public, max-age=60, stale-while-revalidate=900",
            },
          });
        } catch (err) {
          console.error("[Aurelius] GET /api/news error", err);
          return Response.json({ error: "Unable to load market news." }, { status: 503 });
        }
      },
    },
  },
});
