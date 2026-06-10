import { appendMessages, createConversation, listConversations } from "@/lib/chat/conversations.server";
import { getServerEnv } from "@/lib/env.server";
import { createMemberGoal, listMemberGoals } from "@/lib/goals/store.server";
import { mockChatHistory, mockDocuments } from "@/lib/mock-data";
import { listMemberDocuments, mutateVaultStore } from "@/lib/vault/store.server";
import type { DocumentCategory } from "@/lib/vault/types";
import { memberToPublicSession } from "./service.server";
import { mutateStore } from "./store.server";
import type { MemberSession, PublicSession } from "./types";

export const DEV_BYPASS_INVITE_CODE_ID = "dev-bypass-temp";
const DEV_SESSION_DAYS = 30;

const MOCK_CATEGORIES = new Set<DocumentCategory>([
  "ITR",
  "Form 16",
  "GST",
  "Financials",
  "Property",
  "Legal",
  "Remittance",
  "Investments",
  "Other",
]);

const SEED_GOALS = [
  {
    title: "Optimise LTCG before March 2026",
    description: "Harvest gains across listed equity holdings",
    targetDate: "2026-03-15",
  },
  {
    title: "Family trust structuring review",
    description: "Review deed and beneficiary allocations with counsel",
  },
  {
    title: "Advance tax planning — Q4",
    targetDate: "2025-12-15",
  },
] as const;

const SEED_CHAT_MESSAGES: Record<string, { user: string; assistant: string }> = {
  "1": {
    user: "What is my estimated LTCG liability on listed equities for FY25?",
    assistant:
      "Based on your vault holdings, estimated LTCG is ₹1.8–2.1 Cr before exemptions. I can model harvesting scenarios against your March goal.",
  },
  "2": {
    user: "Can I claim GST input credit on the luxury asset purchase noted in my files?",
    assistant:
      "The notice references blocked credits under Section 17(5). We should map the invoice trail and respond within the 30-day window.",
  },
  "3": {
    user: "Walk me through a Section 54F exemption if I sell unlisted shares this quarter.",
    assistant:
      "You would need to reinvest net consideration in residential property within the statutory window. I can draft a checklist against your timeline.",
  },
  "4": {
    user: "Summarise trust taxation implications for the 2019 deed in my vault.",
    assistant:
      "The deed establishes a discretionary trust. Distribution patterns and Section 164 assessments should be reviewed before the next distribution.",
  },
};

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function toDocumentCategory(value: string): DocumentCategory {
  return MOCK_CATEGORIES.has(value as DocumentCategory) ? (value as DocumentCategory) : "Other";
}

export function isDevBypassEnabled(): boolean {
  return getServerEnv("DEV_BYPASS_ENABLED") === "true";
}

export function devBypassRequiresSecret(): boolean {
  return Boolean(getServerEnv("DEV_BYPASS_SECRET")?.trim());
}

export async function seedDevMemberWorkspace(email: string): Promise<void> {
  const normalized = email.toLowerCase();

  const goals = await listMemberGoals(normalized);
  if (goals.length === 0) {
    for (const goal of SEED_GOALS) {
      await createMemberGoal(normalized, goal);
    }
  }

  const docs = await listMemberDocuments(normalized);
  if (docs.length === 0) {
    await mutateVaultStore((store) => {
      for (const [index, doc] of mockDocuments.entries()) {
        store.documents.push({
          id: `doc-${crypto.randomUUID()}`,
          memberEmail: normalized,
          name: doc.name,
          category: toDocumentCategory(doc.category),
          sizeBytes: 640_000 + index * 120_000,
          mimeType: "application/pdf",
          uploadedAt: daysAgoIso(index * 3 + 1),
          status: "analyzed",
        });
      }
    });
  }

  const conversations = await listConversations(normalized);
  if (conversations.length === 0) {
    for (const chat of mockChatHistory) {
      const sample = SEED_CHAT_MESSAGES[chat.id];
      const conv = await createConversation(normalized, chat.title);
      if (sample) {
        await appendMessages(conv.id, normalized, [
          { role: "user", content: sample.user },
          { role: "assistant", content: sample.assistant },
        ]);
      } else {
        await appendMessages(conv.id, normalized, [
          { role: "user", content: `Tell me more about ${chat.title.toLowerCase()}.` },
          {
            role: "assistant",
            content: "I have indexed your vault context and can walk through implications step by step.",
          },
        ]);
      }
    }
  }
}

const DEV_BYPASS_DEFAULT_EMAIL = "dev@aurelius.local";
const DEV_BYPASS_DEFAULT_NAME = "Dev Principal";

export async function quickEnterDevBypass(): Promise<
  | { ok: true; sessionId: string; session: PublicSession }
  | { ok: false; error: string; code?: string }
> {
  if (!isDevBypassEnabled()) {
    return { ok: false, error: "Dev bypass is disabled.", code: "DEV_BYPASS_DISABLED" };
  }

  return enterDevBypass({
    email: getServerEnv("DEV_BYPASS_EMAIL")?.trim() || DEV_BYPASS_DEFAULT_EMAIL,
    fullName: getServerEnv("DEV_BYPASS_NAME")?.trim() || DEV_BYPASS_DEFAULT_NAME,
    secret: getServerEnv("DEV_BYPASS_SECRET")?.trim(),
  });
}

export async function enterDevBypass(input: {
  email: string;
  fullName: string;
  secret?: string;
}): Promise<
  | { ok: true; sessionId: string; session: PublicSession }
  | { ok: false; error: string; code?: string }
> {
  if (!isDevBypassEnabled()) {
    return { ok: false, error: "Dev bypass is disabled.", code: "DEV_BYPASS_DISABLED" };
  }

  const expectedSecret = getServerEnv("DEV_BYPASS_SECRET")?.trim();
  if (expectedSecret && input.secret?.trim() !== expectedSecret) {
    return { ok: false, error: "Invalid dev secret.", code: "DEV_BYPASS_SECRET" };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!email.includes("@") || fullName.length < 2) {
    return { ok: false, error: "Enter a valid name and email.", code: "INVALID_INPUT" };
  }

  const firstName = fullName.split(/\s+/)[0] ?? fullName;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEV_SESSION_DAYS);

  const result = await mutateStore((store) => {
    const existing = store.members.find((m) => m.email === email && !m.revoked);
    if (existing) {
      existing.fullName = fullName;
      existing.firstName = firstName;
      existing.isDemo = false;
      existing.devBypass = true;
      existing.onboardingComplete = true;
      existing.tier = "principal";
      existing.role = "member";
      existing.subscription = "active";
      existing.subscriptionPlan = "Dev Preview";
      existing.inviteCodeId = DEV_BYPASS_INVITE_CODE_ID;
      existing.expiresAt = expiresAt.toISOString();
      delete existing.aiQuotaDaily;
      delete existing.demoPurpose;
      return { ok: true as const, sessionId: existing.id, member: existing };
    }

    const sessionId = `dev-${crypto.randomUUID()}`;
    const newMember: MemberSession = {
      id: sessionId,
      email,
      fullName,
      firstName,
      tier: "principal",
      role: "member",
      inviteCodeId: DEV_BYPASS_INVITE_CODE_ID,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      onboardingComplete: true,
      subscription: "active",
      subscriptionPlan: "Dev Preview",
      devBypass: true,
      isDemo: false,
    };

    store.members.push(newMember);
    return { ok: true as const, sessionId, member: newMember };
  });

  await seedDevMemberWorkspace(email);

  return {
    ok: true,
    sessionId: result.sessionId,
    session: memberToPublicSession(result.member),
  };
}
