import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDistanceToNow } from "date-fns";

import { Loader2 } from "lucide-react";

import {

  articleMatchesFilter,

  NEWS_CATEGORY_META,

  NEWS_FILTER_OPTIONS,

  type NewsFilterId,

} from "@/lib/market-intelligence/news-categories";

import type { MarketArticle, MarketTickerItem, NewsPayload } from "@/lib/market-intelligence/types";

import {

  hasLiveTickerData,

  startMarketAutoRefresh,

  subscribeMarketData,

  type MarketDataSnapshot,

} from "@/services/marketData";



const NEWS_REFRESH_MS = 5 * 60 * 1000;

const DISPLAY_ARTICLE_COUNT = 12;



function TickerRow({ items, loading }: { items: MarketTickerItem[]; loading: boolean }) {

  return (

    <>

      {items.map((item, index) => (

        <span key={`${item.symbol}-${index}`} className="market-intelligence__ticker-segment">

          {index > 0 && <span className="market-intelligence__ticker-divider" aria-hidden>│</span>}

          <span className="market-intelligence__ticker-symbol">{item.symbol}</span>

          {item.unavailable ? (

            <span className="market-intelligence__ticker-unavailable" title="Data unavailable">

              —

            </span>

          ) : (

            <>

              <span className="market-intelligence__ticker-value">{item.value}</span>

              {item.changeAmount && (

                <span

                  className={

                    item.direction === "up"

                      ? "market-intelligence__ticker-change market-intelligence__ticker-change--up"

                      : item.direction === "down"

                        ? "market-intelligence__ticker-change market-intelligence__ticker-change--down"

                        : "market-intelligence__ticker-change"

                  }

                >

                  {item.changeAmount}

                </span>

              )}

              {item.change && (

                <span

                  className={

                    item.direction === "up"

                      ? "market-intelligence__ticker-change market-intelligence__ticker-change--up"

                      : item.direction === "down"

                        ? "market-intelligence__ticker-change market-intelligence__ticker-change--down"

                        : "market-intelligence__ticker-change"

                  }

                >

                  {item.change}

                </span>

              )}

            </>

          )}

        </span>

      ))}

      {loading && (

        <span className="market-intelligence__ticker-loading" aria-hidden>

          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />

        </span>

      )}

    </>

  );

}



function NewsCardSkeleton() {

  return (

    <div className="market-intelligence__card market-intelligence__card--skeleton" aria-hidden>

      <span className="market-intelligence__skeleton-line market-intelligence__skeleton-line--tag" />

      <span className="market-intelligence__skeleton-line market-intelligence__skeleton-line--headline" />

      <span className="market-intelligence__skeleton-line market-intelligence__skeleton-line--meta" />

    </div>

  );

}



function CategoryTag({ category }: { category: MarketArticle["category"] }) {

  const meta = NEWS_CATEGORY_META[category];

  return (

    <span className={`market-intelligence__category market-intelligence__category--${meta.tone}`}>

      {meta.label}

    </span>

  );

}



function NewsCard({ article }: { article: MarketArticle }) {

  const relativeTime = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });



  return (

    <a

      href={article.url}

      target="_blank"

      rel="noopener noreferrer"

      className="market-intelligence__card"

    >

      <CategoryTag category={article.category} />

      <h3 className="market-intelligence__card-headline">{article.headline}</h3>

      <div className="market-intelligence__card-footer">

        <span className="market-intelligence__card-source">{article.source}</span>

        <time className="market-intelligence__card-time" dateTime={article.publishedAt}>

          {relativeTime}

        </time>

      </div>

    </a>

  );

}



export default function LiveIntelligenceFeed() {

  const [marketData, setMarketData] = useState<MarketDataSnapshot>({

    ticker: [],

    fetchedAt: "",

    liveIndices: false,

    marketSession: { status: "closed", label: "MARKET CLOSED", detail: "Last Close" },

    loading: true,

  });

  const [news, setNews] = useState<NewsPayload | null>(null);

  const [loadingNews, setLoadingNews] = useState(true);

  const [activeFilter, setActiveFilter] = useState<NewsFilterId>("all");



  const loadNews = useCallback(async (showSkeleton = false) => {

    if (showSkeleton) setLoadingNews(true);

    try {

      const newsRes = await fetch("/api/news", { cache: "no-store" });

      if (newsRes.ok) {

        const newsData = (await newsRes.json()) as NewsPayload;

        setNews(newsData);

      }

    } finally {

      setLoadingNews(false);

    }

  }, []);



  useEffect(() => {

    const stopRefresh = startMarketAutoRefresh();

    const unsubscribe = subscribeMarketData(setMarketData);

    return () => {

      stopRefresh();

      unsubscribe();

    };

  }, []);



  useEffect(() => {

    loadNews(true);

    const interval = setInterval(() => loadNews(false), NEWS_REFRESH_MS);

    return () => clearInterval(interval);

  }, [loadNews]);



  const filteredArticles = useMemo(() => {

    const articles = news?.articles ?? [];

    return articles

      .filter((article) => articleMatchesFilter(article.category, activeFilter))

      .slice(0, DISPLAY_ARTICLE_COUNT);

  }, [news?.articles, activeFilter]);



  const showTicker = hasLiveTickerData(marketData.ticker);

  const session = marketData.marketSession;

  const isLiveSession = session.status === "live";

  const tickerLabel = isLiveSession ? "LIVE" : session.label;

  const tickerDetail = !isLiveSession ? session.detail : undefined;



  const refreshedLabel = marketData.fetchedAt

    ? `Refreshed ${formatDistanceToNow(new Date(marketData.fetchedAt), { addSuffix: true })}`

    : null;



  return (

    <section className="market-intelligence landing-section" aria-labelledby="market-intelligence-heading">

      <div className="max-w-7xl mx-auto px-5 lg:px-8 w-full min-w-0">

        <div className="market-intelligence__frame">

          {showTicker && (

            <div className="market-intelligence__ticker-bar" aria-label="Live market indices">

              <div

                className={`market-intelligence__ticker-label ${

                  isLiveSession ? "" : "market-intelligence__ticker-label--closed"

                }`}

              >

                {isLiveSession ? <span className="market-intelligence__live-dot" /> : null}

                <span className="market-intelligence__ticker-label-text">{tickerLabel}</span>

                {tickerDetail && (

                  <span className="market-intelligence__ticker-label-detail">{tickerDetail}</span>

                )}

              </div>

              <div className="market-intelligence__ticker-track">

                <div className="market-intelligence__ticker-content" role="marquee" aria-live="polite">

                  <TickerRow items={marketData.ticker} loading={marketData.loading} />

                  <TickerRow items={marketData.ticker} loading={false} />

                </div>

              </div>

              {refreshedLabel && (

                <div className="market-intelligence__ticker-refreshed">{refreshedLabel}</div>

              )}

            </div>

          )}



          <div className="market-intelligence__body">

            <div className="market-intelligence__banner">

              Intelligence filtered for wealth principals — not retail noise

            </div>



            <div className="market-intelligence__body-header">

              <div className="market-intelligence__body-header-main">

                <p className="market-intelligence__eyebrow">Intelligence wire</p>

                <h2 id="market-intelligence-heading" className="market-intelligence__title">

                  Market Intelligence

                </h2>

              </div>

              {news?.fetchedAt && !loadingNews && (

                <p

                  className={

                    news.source === "live"

                      ? "market-intelligence__refreshed market-intelligence__refreshed--live"

                      : "market-intelligence__refreshed"

                  }

                >

                  <span className="market-intelligence__refreshed-dot" aria-hidden />

                  {news.source === "live" ? "Live feed" : "Briefing"}

                  {isLiveSession ? " · Indices live" : session.detail ? ` · ${session.detail}` : ""}

                  <span className="market-intelligence__refreshed-sep" aria-hidden>·</span>

                  {formatDistanceToNow(new Date(news.fetchedAt), { addSuffix: true })}

                </p>

              )}

            </div>



            <div className="market-intelligence__filters" role="tablist" aria-label="Filter intelligence">

              {NEWS_FILTER_OPTIONS.map((filter) => (

                <button

                  key={filter.id}

                  type="button"

                  role="tab"

                  aria-selected={activeFilter === filter.id}

                  className={`market-intelligence__filter ${

                    activeFilter === filter.id ? "market-intelligence__filter--active" : ""

                  }`}

                  onClick={() => setActiveFilter(filter.id)}

                >

                  {filter.label}

                </button>

              ))}

            </div>



            <div className="market-intelligence__cards">

              {loadingNews

                ? Array.from({ length: 6 }, (_, i) => <NewsCardSkeleton key={`sk-${i}`} />)

                : filteredArticles.length > 0

                  ? filteredArticles.map((article) => <NewsCard key={article.id} article={article} />)

                  : (

                    <p className="market-intelligence__empty">

                      No headlines in this filter right now. Try another category or check back shortly.

                    </p>

                  )}

            </div>

          </div>

        </div>

      </div>

    </section>

  );

}


