import { buildAureliusAdvisorSystemPrompt } from "@/lib/ai/advisor-prompt.server";
import { createAureliusCompletion, isAureliusAiConfigured } from "@/lib/ai/router.server";
import { logPrivacyAudit } from "@/lib/privacy/audit.server";
import { appendAiMemory } from "@/lib/privacy/memory.server";
import { PRIVATE_ADVISOR_PRIVACY_RULES } from "@/lib/privacy/prompts.server";
import { addDocument } from "@/lib/vault/store.server";
import { computeWealthSummary, formatInr } from "./calculations";
import { briefPdfFileName } from "./colors";
import { buildIntelligenceBriefPdf } from "./intelligence-pdf.server";
import { getOrCreateProfile, saveProfile } from "./store.server";
import type {
  MemberWealthProfile,
  WealthIntelligenceReport,
  WealthOverviewSummary,
  WealthRecommendation,
  WealthRecommendationCategory,
} from "./types";

const inflight = new Map<string, Promise<void>>();

function hasWealthData(profile: MemberWealthProfile): boolean {
  return (
    profile.assets.length > 0 ||
    profile.liabilities.length > 0 ||
    Boolean(profile.taxSnapshot?.totalIncome || profile.taxSnapshot?.taxPaid)
  );
}

function normalizeRecommendations(raw: unknown): Omit<WealthRecommendation, "id">[] {
  if (!Array.isArray(raw)) return [];
  const validCategories = new Set<WealthRecommendationCategory>([
    "allocation",
    "tax",
    "gold",
    "legal_structure",
  ]);

  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      const category = String(row.category ?? "allocation") as WealthRecommendationCategory;
      if (!row.title || !row.whatToDo || !row.why) return null;
      return {
        category: validCategories.has(category) ? category : "allocation",
        title: String(row.title).trim(),
        whatToDo: String(row.whatToDo).trim(),
        why: String(row.why).trim(),
        estimatedBenefitInr:
          row.estimatedBenefitInr != null ? Number(row.estimatedBenefitInr) : undefined,
        estimatedBenefitLabel: row.estimatedBenefitLabel
          ? String(row.estimatedBenefitLabel)
          : undefined,
      };
    })
    .filter(Boolean) as Omit<WealthRecommendation, "id">[];
}

function attachIds(recs: Omit<WealthRecommendation, "id">[]): WealthRecommendation[] {
  return recs.map((rec) => ({ ...rec, id: `rec-${crypto.randomUUID()}` }));
}

function buildHeuristicRecommendations(
  summary: WealthOverviewSummary,
  memberContext: { profession?: string; firm?: string },
): Omit<WealthRecommendation, "id">[] {
  const recs: Omit<WealthRecommendation, "id">[] = [];
  const { allocation, totalAssets, profile } = summary;

  const cashSlice = allocation.find((s) => s.category === "cash_fd");
  const goldSlice = allocation.find((s) => s.category === "gold");
  const equitySlice = allocation.find((s) => s.category === "equity");
  const cashPct = cashSlice?.percent ?? 0;
  const goldPct = goldSlice?.percent ?? 0;
  const equityPct = equitySlice?.percent ?? 0;
  const cashValue = cashSlice?.value ?? 0;

  if (cashPct > 25 && cashValue >= 10_00_000) {
    const toDebt = Math.round(cashValue * 0.35);
    const toSgb = Math.round(cashValue * 0.2);
    recs.push({
      category: "allocation",
      title: "Idle cash is dragging portfolio returns",
      whatToDo: `You have ${formatInr(cashValue)} in cash/FD (${cashPct}% of assets). Consider moving ${formatInr(toDebt)} into short-duration debt mutual funds and ${formatInr(toSgb)} into Sovereign Gold Bonds via RBI tranches.`,
      why: "Excess liquidity beyond 6–12 months of expenses typically earns 3–4% post-tax while inflation runs higher. A measured shift improves real returns without sacrificing emergency buffers.",
      estimatedBenefitInr: Math.round(cashValue * 0.02),
      estimatedBenefitLabel: "~2% annually on redeployed cash",
    });
  }

  if (goldPct < 12 && totalAssets > 0) {
    const targetGold = Math.round(totalAssets * 0.12);
    const gap = Math.max(0, targetGold - (goldSlice?.value ?? 0));
    recs.push({
      category: "gold",
      title: "Gold allocation is below prudent band",
      whatToDo: `Your gold exposure is ${goldPct}% (${formatInr(goldSlice?.value ?? 0)}). For a ${formatInr(totalAssets)} portfolio, target 12–15% via SGBs — approximately ${formatInr(gap)} in new SGB purchases across upcoming RBI issuances.`,
      why: "SGBs offer 2.5% annual interest, RBI backing, and tax-free capital gains if held to 8-year maturity — superior to physical gold for long-term allocation.",
      estimatedBenefitInr: Math.round(gap * 0.08),
      estimatedBenefitLabel: "tax-free gains + 2.5% coupon",
    });
  }

  if (equityPct > 70) {
    recs.push({
      category: "allocation",
      title: "Equity concentration risk",
      whatToDo: `Equity is ${equityPct}% of your portfolio (${formatInr(equitySlice?.value ?? 0)}). Rebalance ${formatInr(Math.round((equitySlice?.value ?? 0) * 0.1))} into debt funds and gold to stay within a 60–65% equity band for your risk profile.`,
      why: "Single-asset dominance amplifies drawdowns. Principals above ₹5Cr typically benefit from a 60/25/15 equity-debt-gold framework with annual rebalancing.",
      estimatedBenefitInr: Math.round((equitySlice?.value ?? 0) * 0.015),
      estimatedBenefitLabel: "reduced volatility",
    });
  }

  const income = profile.taxSnapshot?.totalIncome;
  const taxPaid = profile.taxSnapshot?.taxPaid;
  if (income && income > 25_00_000) {
    const section80cRoom = 1_50_000;
    const potentialSaving = Math.round(section80cRoom * 0.312);
    recs.push({
      category: "tax",
      title: "Section 80C headroom this FY",
      whatToDo: `Based on reported income of ${formatInr(income)}${taxPaid ? ` and tax paid ${formatInr(taxPaid)}` : ""}, deploy up to ${formatInr(section80cRoom)} into ELSS, PPF, or life insurance premiums before 31 March. Add ₹25,000 NPS (80CCD(1B)) if not already claimed.`,
      why: "Most principals leave 80C unutilised until Q4, forcing lump-sum ELSS entries. Spreading across the year captures market averaging and locks in the 30%+ marginal rate saving.",
      estimatedBenefitInr: potentialSaving,
      estimatedBenefitLabel: "this financial year",
    });
  }

  const isBusinessOwner = Boolean(
    memberContext.firm ||
      memberContext.profession?.toLowerCase().includes("founder") ||
      memberContext.profession?.toLowerCase().includes("business"),
  );

  if ((income ?? 0) >= 1_00_00_000 || isBusinessOwner) {
    recs.push({
      category: "legal_structure",
      title: income && income >= 1_00_00_000 ? "HUF or LLP may reduce family tax leakage" : "Holding company structure for business assets",
      whatToDo:
        income && income >= 1_00_00_000
          ? `At ${formatInr(income)} annual income, evaluate a Hindu Undivided Family (HUF) for ancestral property income and a separate LLP for ${memberContext.firm ?? "operating income"}. Each entity gets its own slab and 80C limits.`
          : `As a business owner, route operating assets through a holding company and keep personal investments in a separate demat/HUF structure to avoid commingling and simplify 54EC/54F planning.`,
      why: "Wrong structure often costs 15–25% more tax than necessary above ₹1Cr income. Restructuring is cheapest before a liquidity event or property sale.",
      estimatedBenefitInr: income ? Math.round(income * 0.08) : undefined,
      estimatedBenefitLabel: "annual tax efficiency",
    });
  }

  return recs.slice(0, 5);
}

async function generateWithClaude(
  summary: WealthOverviewSummary,
  memberContext: { fullName: string; profession?: string; firm?: string },
): Promise<{ summaryLine: string; recommendations: Omit<WealthRecommendation, "id">[] }> {
  const context = {
    member: {
      name: memberContext.fullName,
      profession: memberContext.profession,
      firm: memberContext.firm,
    },
    netWorth: summary.netWorth,
    totalAssets: summary.totalAssets,
    totalLiabilities: summary.totalLiabilities,
    allocation: summary.allocation.map((s) => ({
      category: s.category,
      label: s.name,
      valueInr: s.value,
      percent: s.percent,
    })),
    assets: summary.profile.assets.map((a) => ({
      name: a.name,
      category: a.category,
      valueInr: a.value,
      notes: a.notes,
    })),
    liabilities: summary.profile.liabilities.map((l) => ({
      name: l.name,
      type: l.type,
      valueInr: l.value,
    })),
    legalEntities: summary.profile.legalEntities,
    taxSnapshot: summary.profile.taxSnapshot,
  };

  const system = `You are Aurelius, a private Indian wealth advisor speaking to one HNW principal. Tone: private, confident, direct — like a senior CA and wealth manager in a closed-door meeting. Never generic. Always cite their actual ₹ figures from the data. No disclaimers in the JSON.

${PRIVATE_ADVISOR_PRIVACY_RULES}`;

  const prompt = `Analyse this member's wealth data and produce 3–5 actionable recommendations.

Cover these areas where relevant:
1. Investment allocation — underweight/overweight categories, specific ₹ reallocation amounts
2. Tax saving — 80C (ELSS/PPF/LIC), 80D health insurance, 54EC capital gains bonds, SGB tax-free gains, HUF income splitting
3. Gold — if below 10–15%, recommend SGB with amount; mention 2.5% interest, RBI backing, tax-free on 8-year maturity
4. Legal structure — HUF/LLP/holding company if income > ₹1Cr or business owner

Wealth data:
${JSON.stringify(context, null, 2)}

Return JSON only:
{
  "summaryLine": "One direct executive sentence with a ₹ figure",
  "recommendations": [
    {
      "category": "allocation"|"tax"|"gold"|"legal_structure",
      "title": "Short headline",
      "whatToDo": "Specific action with ₹ amounts",
      "why": "Private rationale tied to their data",
      "estimatedBenefitInr": number,
      "estimatedBenefitLabel": "e.g. this FY or ~2.3% annually"
    }
  ]
}

Rules:
- 3 to 5 recommendations, each category at most twice
- estimatedBenefitInr must be realistic positive INR integers
- Use Indian number context (lakhs/crores mentally but output raw INR in text as ₹X,XX,XXX)`;

  const raw = await createAureliusCompletion({
    system: buildAureliusAdvisorSystemPrompt({
      clientName: memberContext.fullName,
      tier: "principal",
      feature: "wealth_brief",
    }) + `\n\n${system}`,
    messages: [{ role: "user", content: prompt }],
    feature: "wealth_brief",
    maxTokens: 2000,
  });

  const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")) as {
    summaryLine?: string;
    recommendations?: unknown;
  };

  const recommendations = normalizeRecommendations(parsed.recommendations);
  if (recommendations.length === 0) {
    throw new Error("Claude returned no structured recommendations.");
  }

  return {
    summaryLine: parsed.summaryLine?.trim() || recommendations[0].title,
    recommendations,
  };
}

async function runIntelligenceGeneration(
  email: string,
  memberId: string,
  memberContext: { fullName: string; profession?: string; firm?: string },
  reportId: string,
  preparedAt: string,
): Promise<void> {
  const profile = await getOrCreateProfile(email);
  if (!hasWealthData(profile)) return;

  const summary = computeWealthSummary(profile);

  try {
    let summaryLine: string;
    let recommendations: Omit<WealthRecommendation, "id">[];

    if (isAureliusAiConfigured()) {
      const generated = await generateWithClaude(summary, memberContext);
      summaryLine = generated.summaryLine;
      recommendations = generated.recommendations;
    } else {
      recommendations = buildHeuristicRecommendations(summary, memberContext);
      summaryLine =
        recommendations[0]?.title ??
        `Net worth ${formatInr(summary.netWorth)} — review allocation and tax opportunities below.`;
    }

    const report: WealthIntelligenceReport = {
      id: reportId,
      preparedFor: memberContext.fullName,
      preparedAt,
      status: "ready",
      summaryLine,
      recommendations: attachIds(recommendations),
    };

    const pdfBuffer = await buildIntelligenceBriefPdf(report);
    const pdfFileName = briefPdfFileName(new Date(preparedAt));
    const vaultDoc = await addDocument({
      memberEmail: email,
      name: pdfFileName,
      category: "Intelligence",
      sizeBytes: pdfBuffer.length,
      mimeType: "application/pdf",
      fileBuffer: pdfBuffer,
    });

    report.vaultDocumentId = vaultDoc.id;
    report.pdfFileName = pdfFileName;

    const latest = await getOrCreateProfile(email);
    latest.intelligenceReport = report;
    await saveProfile(latest);

    await logPrivacyAudit(memberId, {
      action: "ai_intelligence",
      detail: `Generated intelligence brief with ${report.recommendations.length} recommendations`,
      sessionId: reportId,
    });

    await appendAiMemory(memberId, email, {
      type: "wealth_snapshot",
      content: report.summaryLine ?? report.recommendations[0]?.title ?? "Wealth intelligence brief generated",
      sourceId: reportId,
    });
  } catch (err) {
    const latest = await getOrCreateProfile(email);
    latest.intelligenceReport = {
      id: reportId,
      preparedFor: memberContext.fullName,
      preparedAt,
      status: "failed",
      recommendations: [],
      errorMessage: err instanceof Error ? err.message : "Intelligence generation failed.",
    };
    await saveProfile(latest);
  }
}

export async function prepareAndScheduleIntelligenceRefresh(
  email: string,
  memberId: string,
  memberContext: { fullName: string; profession?: string; firm?: string },
): Promise<void> {
  const key = email.toLowerCase();
  const profile = await getOrCreateProfile(key);
  if (!hasWealthData(profile)) return;

  const reportId = `brief-${crypto.randomUUID()}`;
  const preparedAt = new Date().toISOString();
  profile.intelligenceReport = {
    id: reportId,
    preparedFor: memberContext.fullName,
    preparedAt,
    status: "generating",
    recommendations: [],
  };
  await saveProfile(profile);

  if (inflight.has(key)) return;

  const job = runIntelligenceGeneration(key, memberId, memberContext, reportId, preparedAt).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, job);
}

export function buildDemoIntelligenceReport(
  fullName: string,
  summary: WealthOverviewSummary,
): WealthIntelligenceReport {
  const recommendations = attachIds(buildHeuristicRecommendations(summary, {}));
  const preparedAt = new Date().toISOString();
  return {
    id: "demo-brief",
    preparedFor: fullName,
    preparedAt,
    status: "ready",
    summaryLine: `You have ${formatInr(summary.allocation.find((s) => s.category === "cash_fd")?.value ?? 0)} in liquid savings — redeploying a portion could lift returns by ~2.3% annually.`,
    recommendations,
    pdfFileName: "Wealth Intelligence Brief — demo.pdf",
  };
}
