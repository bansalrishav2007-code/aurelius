import { buildAureliusAdvisorSystemPrompt } from "@/lib/ai/advisor-prompt.server";
import { createAureliusCompletion } from "@/lib/ai/router.server";
import type { MarketBrief } from "./types";

const BRIEF_SYSTEM = `You are Aurelius, a private wealth intelligence assistant for Indian HNIs. Generate a concise morning market brief covering:
1. One key macro development in India today
2. One global event relevant to Indian HNI portfolios
3. One sector to watch this week
4. One actionable insight (buy/hold/review — no specific stock tips)

Keep it under 150 words. Tone: sophisticated, confident, like a Goldman Sachs morning note.

Format with clear section labels on separate lines:
India Macro:
Global:
Sector Watch:
Action:`;

const briefCache = new Map<string, MarketBrief>();

export function getCachedBrief(memberEmail: string): MarketBrief | undefined {
  return briefCache.get(memberEmail.toLowerCase());
}

export function setCachedBrief(memberEmail: string, brief: MarketBrief): void {
  briefCache.set(memberEmail.toLowerCase(), brief);
}

export async function generateMarketBrief(memberEmail: string): Promise<MarketBrief> {
  let content = "";

  const system = buildAureliusAdvisorSystemPrompt({
    clientName: "Principal",
    tier: "principal",
    feature: "market_intel",
  }) + `\n\n${BRIEF_SYSTEM}`;

  try {
    content = await createAureliusCompletion({
      system,
      messages: [
        {
          role: "user",
          content: `Generate today's intelligence brief for an Indian HNI client (${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}).`,
        },
      ],
      feature: "market_intel",
      memberEmail,
      maxTokens: 2000,
    });
  } catch (err) {
    console.error("[Market Intel] Brief generation failed:", err);
  }

  if (!content.trim()) {
    content = `India Macro: RBI policy stability and resilient FII flows support a constructive near-term equity backdrop for diversified portfolios.

Global: US rate expectations and dollar moves continue to influence EM allocations — monitor USD/INR for remittance and import-heavy businesses.

Sector Watch: Financials and quality mid-caps merit attention as earnings season clarifies margin trajectories.

Action: Review — rebalance idle cash above six months of expenses into staggered debt and equity SIPs rather than lump-sum deployment.`;
  }

  const brief: MarketBrief = {
    content: content.trim(),
    generatedAt: new Date().toISOString(),
  };

  setCachedBrief(memberEmail, brief);
  return brief;
}
