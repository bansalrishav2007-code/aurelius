import YahooFinance from "yahoo-finance2";
import { getOrCreateProfile } from "@/lib/wealth/store.server";

const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type AdvisorTrigger = {
  id: string;
  severity: "info" | "warning" | "urgent";
  message: string;
  preloadMessage: string;
};

function advanceTaxDaysToQ1(): number | null {
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const due = new Date(fyStartYear + 1, 5, 15);
  return Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
}

export async function computeAdvisorTriggers(memberEmail: string): Promise<AdvisorTrigger[]> {
  const triggers: AdvisorTrigger[] = [];
  const profile = await getOrCreateProfile(memberEmail);

  try {
    const nifty = await yahoo.quote("^NSEI");
    const change = nifty.regularMarketChangePercent ?? 0;
    if (change <= -2) {
      triggers.push({
        id: "market-drop",
        severity: "warning",
        message: `NIFTY dropped ${Math.abs(change).toFixed(1)}% today — want me to review your equity exposure?`,
        preloadMessage: "NIFTY dropped today — review my equity exposure and suggest what I should do.",
      });
    }
  } catch {
    /* market data unavailable */
  }

  const daysToQ1 = advanceTaxDaysToQ1();
  if (daysToQ1 != null && daysToQ1 >= 0 && daysToQ1 <= 7) {
    triggers.push({
      id: "advance-tax-q1",
      severity: "urgent",
      message: `Advance tax Q1 due in ${daysToQ1} day${daysToQ1 === 1 ? "" : "s"} — shall I calculate your liability?`,
      preloadMessage: "Advance tax Q1 is due soon — calculate my estimated liability and what I should pay.",
    });
  }

  const staleDays = (Date.now() - new Date(profile.updatedAt).getTime()) / 86_400_000;
  if (staleDays >= 30 && (profile.assets.length > 0 || profile.liabilities.length > 0)) {
    triggers.push({
      id: "stale-portfolio",
      severity: "info",
      message: "Your wealth data hasn't been updated in a month — shall we review?",
      preloadMessage: "My wealth data hasn't been updated recently — help me review what needs updating.",
    });
  }

  return triggers.slice(0, 3);
}
