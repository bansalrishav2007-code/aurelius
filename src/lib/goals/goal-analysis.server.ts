import { buildAureliusAdvisorSystemPrompt } from "@/lib/ai/advisor-prompt.server";
import { createAureliusCompletion } from "@/lib/ai/router.server";
import { formatInr } from "@/lib/wealth/calculations";
import type { EnrichedGoal, GoalAiAdvice } from "./types";

const GOAL_ADVISOR_FALLBACK = `You are Aurelius, a private wealth advisor. A client has shared a financial goal. Analyze their progress and provide:
1. Realistic assessment — are they on track?
2. Recommended monthly SIP/investment amount to reach the goal
3. Best instruments to consider for this goal (based on timeline and amount)
4. Risks to watch out for
5. One sharp piece of advice

Be concise, sophisticated, and direct. Speak like a seasoned private banker.

Format with these exact headers:

## Realistic Assessment
## Recommended Monthly Amount
## Best Instruments
## Risks to Watch
## Sharp Advice`;

function parseSections(raw: string): GoalAiAdvice {
  const pick = (header: string, next?: string) => {
    const pattern = next
      ? new RegExp(`## ${header}\\s*([\\s\\S]*?)(?=## ${next}|$)`, "i")
      : new RegExp(`## ${header}\\s*([\\s\\S]*?)$`, "i");
    return raw.match(pattern)?.[1]?.trim() ?? "";
  };

  return {
    realisticAssessment: pick("Realistic Assessment", "Recommended Monthly Amount"),
    recommendedMonthly: pick("Recommended Monthly Amount", "Best Instruments"),
    bestInstruments: pick("Best Instruments", "Risks to Watch"),
    risks: pick("Risks to Watch", "Sharp Advice"),
    sharpAdvice: pick("Sharp Advice"),
    generatedAt: new Date().toISOString(),
  };
}

function buildGoalContext(goal: EnrichedGoal): string {
  return `Goal: ${goal.title}
Category: ${goal.category ?? "Not specified"}
Target amount: ${goal.targetAmount ? formatInr(goal.targetAmount) : "Not set"}
Current amount: ${formatInr(goal.currentAmount ?? 0)}
Progress: ${goal.progressPercent}%
Gap: ${formatInr(goal.gapAmount)}
Target date: ${goal.targetDate ? new Date(goal.targetDate).toLocaleDateString("en-IN") : "Not set"}
Months remaining: ${goal.monthsRemaining ?? "—"}
Monthly saving needed: ${goal.monthlySavingNeeded !== null ? formatInr(goal.monthlySavingNeeded) : "—"}
Track status: ${goal.trackStatus}
Priority: ${goal.priority}`;
}

export async function analyzeGoalProgress(goal: EnrichedGoal): Promise<GoalAiAdvice> {
  const userPrompt = `Analyze this client's financial goal and provide tailored guidance.\n\n${buildGoalContext(goal)}`;

  const system = buildAureliusAdvisorSystemPrompt({
    clientName: goal.title.split(" ")[0] ?? "Principal",
    tier: "principal",
    feature: "goals",
    goalsSummary: buildGoalContext(goal),
  }) + `\n\n${GOAL_ADVISOR_FALLBACK}`;

  let raw = "";
  try {
    raw = await createAureliusCompletion({
      system,
      messages: [{ role: "user", content: userPrompt }],
      feature: "goals",
      maxTokens: 2000,
    });
  } catch (err) {
    console.error("[Goals] AI analysis failed:", goal.id, err);
  }

  if (!raw.trim()) {
    return {
      realisticAssessment:
        goal.trackStatus === "achieved"
          ? "You have reached this goal — consider redeploying surplus capital."
          : goal.trackStatus === "on_track"
            ? "Progress appears aligned with your timeline based on current savings."
            : "You are behind the expected pace — increase contributions or revisit the target date.",
      recommendedMonthly:
        goal.monthlySavingNeeded !== null
          ? `Consider allocating ${formatInr(goal.monthlySavingNeeded)} per month.`
          : "Set a target date to calculate a monthly contribution.",
      bestInstruments:
        "Equity SIPs for long horizons (7+ years); hybrid/debt funds for 3–5 year goals; liquid funds for emergency reserves.",
      risks: "Inflation erosion, market volatility, and liquidity mismatch with the goal timeline.",
      sharpAdvice: "Automate monthly transfers on salary credit day — discipline beats timing.",
      generatedAt: new Date().toISOString(),
    };
  }

  return parseSections(raw);
}

export async function askAboutGoal(goal: EnrichedGoal, question: string, prior?: GoalAiAdvice): Promise<string> {
  const context = prior
    ? `Prior advice summary:
Assessment: ${prior.realisticAssessment}
Monthly: ${prior.recommendedMonthly}
Instruments: ${prior.bestInstruments}`
    : buildGoalContext(goal);

  const userPrompt = `${context}

Client follow-up question: ${question}

Answer in 2-4 concise sentences. India-specific where relevant.`;

  try {
    return await createAureliusCompletion({
      system: buildAureliusAdvisorSystemPrompt({
        clientName: "Principal",
        tier: "principal",
        feature: "goals",
      }),
      messages: [{ role: "user", content: userPrompt }],
      feature: "goals",
      maxTokens: 2000,
    });
  } catch (err) {
    console.error("[Goals] Follow-up failed:", goal.id, err);
  }

  return "AI is temporarily unavailable. Please try again shortly.";
}
