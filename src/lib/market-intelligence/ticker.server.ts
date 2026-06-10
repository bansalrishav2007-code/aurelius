import YahooFinance from "yahoo-finance2";
import { getIndianMarketSession } from "./market-hours";
import type { MarketSessionState, MarketTickerItem } from "./types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const TICKER_SYMBOLS = {
  sensex: "^BSESN",
  nifty: "^NSEI",
  usdInr: "USDINR=X",
  gold: "GC=F",
} as const;

type YahooQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
};

function formatIndianNumber(n: number, decimals = 2): string {
  const fixed = n.toFixed(decimals);
  const [intPart, dec] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec ? `${withCommas}.${dec}` : withCommas;
}

function unavailableItem(symbol: string): MarketTickerItem {
  return {
    symbol,
    value: null,
    changeAmount: null,
    change: null,
    direction: "unavailable",
    unavailable: true,
  };
}

function buildTickerItem(
  symbol: string,
  price: number,
  previousClose: number,
  formatValue: (n: number) => string = (n) => formatIndianNumber(n),
  changeDecimals = 2,
): MarketTickerItem {
  const changeAbs = price - previousClose;
  const changePct = previousClose > 0 ? (changeAbs / previousClose) * 100 : 0;
  const direction: MarketTickerItem["direction"] =
    changePct > 0.02 ? "up" : changePct < -0.02 ? "down" : "flat";
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "—";
  const sign = changePct >= 0 ? "+" : "";

  return {
    symbol,
    value: formatValue(price),
    changeAmount: `${arrow} ${formatIndianNumber(Math.abs(changeAbs), changeDecimals)}`,
    change: `${sign}${changePct.toFixed(2)}%`,
    direction,
  };
}

function buildFromQuote(
  label: string,
  quote: YahooQuote | undefined,
  formatValue?: (n: number) => string,
  changeDecimals = 2,
): MarketTickerItem | null {
  const price = quote?.regularMarketPrice;
  const previousClose = quote?.regularMarketPreviousClose ?? price;

  if (typeof price !== "number" || !Number.isFinite(price)) return null;
  if (typeof previousClose !== "number" || !Number.isFinite(previousClose)) return null;

  return buildTickerItem(label, price, previousClose, formatValue, changeDecimals);
}

async function fetchYahooQuotes(): Promise<Map<string, YahooQuote>> {
  const symbols = Object.values(TICKER_SYMBOLS);
  try {
    const result = await yahooFinance.quote(symbols);
    const quotes = Array.isArray(result) ? result : [result];
    const map = new Map<string, YahooQuote>();

    for (const quote of quotes) {
      if (quote?.symbol) map.set(quote.symbol, quote as YahooQuote);
    }

    return map;
  } catch (err) {
    console.warn("[Aurelius] yahoo-finance2 quote failed", err);
    return new Map();
  }
}

export async function getMarketTickerItems(): Promise<{
  items: MarketTickerItem[];
  liveIndices: boolean;
  marketSession: MarketSessionState;
}> {
  const marketSession = getIndianMarketSession();
  const quotes = await fetchYahooQuotes();

  const sensex = buildFromQuote("SENSEX", quotes.get(TICKER_SYMBOLS.sensex));
  const nifty = buildFromQuote("NIFTY 50", quotes.get(TICKER_SYMBOLS.nifty));
  const usdInr = buildFromQuote(
    "USD/INR",
    quotes.get(TICKER_SYMBOLS.usdInr),
    (n) => n.toFixed(2),
    2,
  );
  const gold = buildFromQuote(
    "GOLD",
    quotes.get(TICKER_SYMBOLS.gold),
    (n) => `$${formatIndianNumber(n)}`,
    2,
  );

  const items: MarketTickerItem[] = [
    sensex ?? unavailableItem("SENSEX"),
    nifty ?? unavailableItem("NIFTY 50"),
    gold ?? unavailableItem("GOLD"),
    usdInr ?? unavailableItem("USD/INR"),
  ];

  const liveIndices = marketSession.status === "live" && Boolean(sensex && nifty);
  const availableCount = items.filter((item) => !item.unavailable).length;

  if (availableCount > 0) {
    console.info("[Aurelius] yahoo-finance2 ticker loaded", {
      available: availableCount,
      session: marketSession.status,
      sensex: sensex?.value,
      nifty: nifty?.value,
    });
  } else {
    console.warn("[Aurelius] yahoo-finance2 ticker unavailable — all feeds failed");
  }

  return { items, liveIndices, marketSession };
}
