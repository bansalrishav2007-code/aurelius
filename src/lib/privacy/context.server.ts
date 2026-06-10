import { listConversations } from "@/lib/chat/conversations.server";
import { listMemberGoals } from "@/lib/goals/store.server";
import { computeWealthSummary } from "@/lib/wealth/calculations";
import { getOrCreateProfile } from "@/lib/wealth/store.server";
import { listMemberDocuments } from "@/lib/vault/store.server";
import { logPrivacyAudit } from "./audit.server";
import { formatMemoryForPrompt, readAiMemory } from "./memory.server";
import type { UserPrivateContext } from "./types";

/**
 * Always scope context to the current user only.
 * NEVER fetch cross-user data — each field is filtered by memberId/memberEmail.
 */
export async function getUserVaultData(input: {
  memberId: string;
  memberEmail: string;
  fullName: string;
  profession?: string;
  firm?: string;
  sessionId?: string;
}): Promise<UserPrivateContext> {
  const email = input.memberEmail.toLowerCase();

  const [profile, goals, memory, conversations, documents] = await Promise.all([
    getOrCreateProfile(email).catch(() => null),
    listMemberGoals(email),
    readAiMemory(input.memberId, email),
    listConversations(email),
    listMemberDocuments(email),
  ]);
  const wealthOverview = profile ? computeWealthSummary(profile) : null;

  await logPrivacyAudit(input.memberId, {
    action: "memory_read",
    detail: `Loaded private context: ${memory.entries.length} memory entries, ${goals.length} goals, ${documents.length} documents`,
    sessionId: input.sessionId,
  });

  return {
    memberId: input.memberId,
    memberEmail: email,
    fullName: input.fullName,
    profession: input.profession,
    firm: input.firm,
    wealth: wealthOverview
      ? {
          netWorth: wealthOverview.netWorth,
          totalAssets: wealthOverview.totalAssets,
          totalLiabilities: wealthOverview.totalLiabilities,
          allocation: wealthOverview.allocation.map((s) => ({
            category: s.category,
            label: s.name,
            value: s.value,
            percent: s.percent,
          })),
          assets: wealthOverview.profile.assets.map((a) => ({
            name: a.name,
            value: a.value,
            category: a.category,
          })),
          liabilities: wealthOverview.profile.liabilities.map((l) => ({
            name: l.name,
            amount: l.value,
            type: l.type,
          })),
          legalEntities: wealthOverview.profile.legalEntities.map((e) => ({
            name: e.name,
            entityType: e.entityType,
            role: e.role,
            value: e.value,
          })),
          taxSnapshot: wealthOverview.profile.taxSnapshot
            ? {
                assessmentYear: wealthOverview.profile.taxSnapshot.assessmentYear,
                totalIncome: wealthOverview.profile.taxSnapshot.totalIncome,
                taxPaid: wealthOverview.profile.taxSnapshot.taxPaid,
                taxPayable: wealthOverview.profile.taxSnapshot.estimatedTaxFy,
                used80C: wealthOverview.profile.taxSnapshot.used80C,
                tdsPaid: wealthOverview.profile.taxSnapshot.taxPaid,
              }
            : null,
        }
      : null,
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      status: g.status,
      targetAmount: g.targetAmount,
      targetDate: g.targetDate,
    })),
    memory: memory.entries,
    recentConversations: conversations.slice(0, 8).map((c) => {
      const last = c.messages[c.messages.length - 1];
      return {
        id: c.id,
        title: c.title,
        preview: last?.content.slice(0, 160),
      };
    }),
    documents: documents.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
    })),
    healthScore: wealthOverview?.healthScore ?? null,
    alerts: wealthOverview?.alerts?.map((a) => a.message) ?? [],
    intelligenceBrief: profile?.intelligenceReport?.recommendations
      ?.slice(0, 4)
      .map((r) => `${r.title}: ${r.whatToDo}`)
      .join("; ") ?? null,
  };
}

export function buildUserContextPromptBlock(ctx: UserPrivateContext): string {
  const parts: string[] = [
    `CLIENT IDENTITY: ${ctx.fullName}${ctx.profession ? ` · ${ctx.profession}` : ""}${ctx.firm ? ` · ${ctx.firm}` : ""}`,
  ];

  if (ctx.wealth) {
    parts.push(
      `WEALTH SNAPSHOT (₹): Net worth ${ctx.wealth.netWorth.toLocaleString("en-IN")}; Assets ${ctx.wealth.totalAssets.toLocaleString("en-IN")}; Liabilities ${ctx.wealth.totalLiabilities.toLocaleString("en-IN")}`,
      `ALLOCATION: ${ctx.wealth.allocation.map((s) => `${s.label} ${s.percent}% (${s.value.toLocaleString("en-IN")})`).join("; ") || "No assets yet"}`,
    );
    if (ctx.wealth.taxSnapshot?.totalIncome) {
      parts.push(
        `TAX (ITR): AY ${ctx.wealth.taxSnapshot.assessmentYear ?? "—"}; Income ₹${ctx.wealth.taxSnapshot.totalIncome.toLocaleString("en-IN")}; Tax paid ₹${(ctx.wealth.taxSnapshot.taxPaid ?? 0).toLocaleString("en-IN")}`,
      );
    }
    if (ctx.wealth.legalEntities.length) {
      parts.push(`LEGAL ENTITIES: ${ctx.wealth.legalEntities.map((e) => e.name).join(", ")}`);
    }
  }

  if (ctx.goals.length) {
    parts.push(`GOALS: ${ctx.goals.slice(0, 6).map((g) => g.title).join("; ")}`);
  }

  const memoryBlock = formatMemoryForPrompt(ctx.memory);
  if (memoryBlock) {
    parts.push(`PRIVATE CLIENT MEMORY (reference naturally — e.g. "Last month you mentioned…"):\n${memoryBlock}`);
  }

  if (ctx.recentConversations.length) {
    parts.push(
      `RECENT TOPICS: ${ctx.recentConversations.map((c) => c.title).join("; ")}`,
    );
  }

  if (ctx.healthScore) {
    parts.push(`PORTFOLIO HEALTH: ${ctx.healthScore.score}/100 — ${ctx.healthScore.bandLabel}`);
  }

  if (ctx.alerts?.length) {
    parts.push(`ACTIVE ALERTS: ${ctx.alerts.join(" | ")}`);
  }

  if (ctx.intelligenceBrief) {
    parts.push(`INTELLIGENCE BRIEF: ${ctx.intelligenceBrief}`);
  }

  if (ctx.documents.length) {
    parts.push(
      `VAULT DOCUMENTS (${ctx.documents.length}): ${ctx.documents.slice(0, 12).map((d) => `${d.name} [${d.category}]`).join("; ")}`,
    );
  }

  return parts.join("\n\n");
}
