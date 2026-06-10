import YahooFinance from "yahoo-finance2";

const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type LiveDataBundle = {
  fetchedAt: string;
  markets?: {
    nifty: { price: number; changePercent: number };
    sensex: { price: number; changePercent: number };
  };
  sgb?: {
    note: string;
    latestSeries?: string;
    indicativeYield?: string;
  };
  taxNote?: string;
};

function wantsMarkets(text: string) {
  return /\b(nifty|sensex|market|equity market|stock market|indices)\b/i.test(text);
}

function wantsSgb(text: string) {
  return /\b(sgb|sovereign gold bond|rbi gold)\b/i.test(text);
}

function wantsTax(text: string) {
  return /\b(tax|itr|advance tax|80c|capital gains|tds)\b/i.test(text);
}

async function fetchQuote(symbol: string) {
  try {
    const q = await yahoo.quote(symbol);
    const price = q.regularMarketPrice ?? 0;
    const changePercent = q.regularMarketChangePercent ?? 0;
    return { price, changePercent };
  } catch {
    return null;
  }
}

export function detectLiveDataNeeds(text: string): ("markets" | "sgb" | "tax")[] {
  const needs: ("markets" | "sgb" | "tax")[] = [];
  if (wantsMarkets(text)) needs.push("markets");
  if (wantsSgb(text)) needs.push("sgb");
  if (wantsTax(text)) needs.push("tax");
  return needs;
}

export async function fetchLiveAdvisorData(
  userMessage: string,
  taxContext?: { assessmentYear?: string; totalIncome?: number; taxPaid?: number } | null,
): Promise<LiveDataBundle | null> {
  const needs = detectLiveDataNeeds(userMessage);
  if (needs.length === 0) return null;

  const bundle: LiveDataBundle = { fetchedAt: new Date().toISOString() };

  if (needs.includes("markets")) {
    const [nifty, sensex] = await Promise.all([fetchQuote("^NSEI"), fetchQuote("^BSESN")]);
    if (nifty || sensex) {
      bundle.markets = {
        nifty: nifty ?? { price: 0, changePercent: 0 },
        sensex: sensex ?? { price: 0, changePercent: 0 },
      };
    }
  }

  if (needs.includes("sgb")) {
    bundle.sgb = {
      note: "Latest RBI Sovereign Gold Bond tranches are issued periodically. Verify current series on rbi.org.in/SGB.",
      latestSeries: "2025-26 Series (check RBI for open window)",
      indicativeYield: "~2.5% p.a. + gold price appreciation (historical reference)",
    };
  }

  if (needs.includes("tax") && taxContext) {
    bundle.taxNote = `Client ITR context: AY ${taxContext.assessmentYear ?? "—"}; declared income ₹${(taxContext.totalIncome ?? 0).toLocaleString("en-IN")}; tax paid ₹${(taxContext.taxPaid ?? 0).toLocaleString("en-IN")}.`;
  }

  return bundle;
}

export function formatLiveDataBlock(data: LiveDataBundle): string {
  const parts: string[] = [`LIVE DATA (fetched ${new Date(data.fetchedAt).toLocaleString("en-IN")}):`];
  if (data.markets) {
    parts.push(
      `NIFTY 50: ${data.markets.nifty.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })} (${data.markets.nifty.changePercent.toFixed(2)}% today)`,
      `SENSEX: ${data.markets.sensex.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })} (${data.markets.sensex.changePercent.toFixed(2)}% today)`,
    );
  }
  if (data.sgb) {
    parts.push(`SGB: ${data.sgb.note}`, `Series: ${data.sgb.latestSeries}`, `Yield: ${data.sgb.indicativeYield}`);
  }
  if (data.taxNote) parts.push(data.taxNote);
  return parts.join("\n");
}
