import YahooFinance from "yahoo-finance2";
import type { MacroIndicator } from "./types";

const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const STATIC_RBI_REPO = 6.5;
const STATIC_BOND_10Y = 6.85;

async function fetchQuote(symbol: string) {
  try {
    const q = await yahoo.quote(symbol);
    return {
      price: q.regularMarketPrice ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
    };
  } catch {
    return null;
  }
}

function formatInr(value: number, decimals = 2) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}`;
}

function formatPct(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function buildTrend7d(changePercent: number | null): number[] {
  const base = 50;
  const drift = (changePercent ?? 0) / 10;
  return Array.from({ length: 7 }, (_, i) => base + drift * i + (i % 2 === 0 ? 1 : -1));
}

export async function fetchMacroIndicators(): Promise<{
  indicators: MacroIndicator[];
  updatedAt: string;
}> {
  const updatedAt = new Date().toISOString();

  const [sensex, nifty, usdInr, goldUsd] = await Promise.all([
    fetchQuote("^BSESN"),
    fetchQuote("^NSEI"),
    fetchQuote("INR=X"),
    fetchQuote("GC=F"),
  ]);

  let goldPer10g = 72_500;
  let goldChange: number | null = null;
  if (goldUsd && usdInr) {
    const inrPerOz = goldUsd.price * usdInr.price;
    goldPer10g = (inrPerOz / 31.1035) * 10;
    goldChange = (goldUsd.changePercent + usdInr.changePercent) / 2;
  }

  const indicators: MacroIndicator[] = [
    {
      id: "sensex",
      label: "SENSEX",
      value: sensex ? formatInr(sensex.price, 0) : "82,450",
      changePercent: sensex?.changePercent ?? 0.42,
      changeLabel: formatPct(sensex?.changePercent ?? 0.42),
      isLive: Boolean(sensex),
      trend7d: buildTrend7d(sensex?.changePercent ?? 0.42),
    },
    {
      id: "nifty",
      label: "NIFTY 50",
      value: nifty ? formatInr(nifty.price, 0) : "25,120",
      changePercent: nifty?.changePercent ?? 0.38,
      changeLabel: formatPct(nifty?.changePercent ?? 0.38),
      isLive: Boolean(nifty),
      trend7d: buildTrend7d(nifty?.changePercent ?? 0.38),
    },
    {
      id: "gold",
      label: "Gold (₹/10g)",
      value: formatInr(goldPer10g, 0),
      changePercent: goldChange,
      changeLabel: goldChange !== null ? formatPct(goldChange) : "+0.15%",
      isLive: Boolean(goldUsd && usdInr),
      trend7d: buildTrend7d(goldChange),
    },
    {
      id: "usdinr",
      label: "USD/INR",
      value: usdInr ? usdInr.price.toFixed(2) : "83.42",
      changePercent: usdInr?.changePercent ?? -0.08,
      changeLabel: formatPct(usdInr?.changePercent ?? -0.08),
      isLive: Boolean(usdInr),
      trend7d: buildTrend7d(usdInr?.changePercent ?? -0.08),
    },
    {
      id: "repo",
      label: "RBI Repo Rate",
      value: `${STATIC_RBI_REPO.toFixed(2)}%`,
      changePercent: null,
      changeLabel: "Unchanged",
      isLive: false,
      trend7d: buildTrend7d(0),
    },
    {
      id: "bond10y",
      label: "10Y Govt Bond Yield",
      value: `${STATIC_BOND_10Y.toFixed(2)}%`,
      changePercent: -0.05,
      changeLabel: "-0.05%",
      isLive: false,
      trend7d: buildTrend7d(-0.05),
    },
  ];

  return { indicators, updatedAt };
}
