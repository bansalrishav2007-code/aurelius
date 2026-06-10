export type MarketSessionState =
  | { status: "live"; label: "LIVE" }
  | { status: "closed"; label: "MARKET CLOSED"; detail: "Last Close" }
  | { status: "weekend"; label: "MARKET CLOSED"; detail: "Opens Monday" };

/** Indian equity session: Mon–Fri 9:15 AM – 3:30 PM IST */
export function getIndianMarketSession(now = new Date()): MarketSessionState {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  const open = 9 * 60 + 15;
  const close = 15 * 60 + 30;

  if (day === 0 || day === 6) {
    return { status: "weekend", label: "CLOSED", detail: "Market Closed — Opens Monday" };
  }

  if (minutes >= open && minutes < close) {
    return { status: "live", label: "LIVE" };
  }

  return { status: "closed", label: "CLOSED", detail: "Last Close" };
}
