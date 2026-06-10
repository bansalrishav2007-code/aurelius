import { createAureliusCompletion } from "@/lib/ai/router.server";
import { readStore } from "@/lib/auth/store.server";
import type { MemberSession, PublicSession } from "@/lib/auth/types";
import { readUserEncryptedFile, writeUserEncryptedFile } from "@/lib/privacy/user-store.server";

const WELCOME_FILE = "identity-welcome.enc";

type WelcomeStore = { welcomeMessage: string; generatedAt: string };

const PLAN_BADGES: Record<MemberSession["tier"], string> = {
  founding: "Patriarch — Premium",
  principal: "Principal — Tier I",
  "family-office": "Family Office Charter",
};

function memberNumberFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String((hash % 99_999) + 1).padStart(5, "0");
}

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function resolveValidThrough(member: MemberSession): string {
  if (member.tier === "founding") return "Lifetime Access";
  if (member.subscription === "active" && !member.expiresAt) return "Lifetime Access";
  const expires = new Date(member.expiresAt);
  if (expires.getFullYear() > 2090) return "Lifetime Access";
  return expires.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function resolvePlanBadge(member: MemberSession): string {
  if (member.subscriptionPlan?.trim()) return member.subscriptionPlan.trim();
  if (member.role === "EXPERT") return "Expert — Advisory Network";
  if (member.role === "SUPER_ADMIN") return "Founding Circle — Admin";
  return PLAN_BADGES[member.tier];
}

function resolveStatus(member: MemberSession): "Active Member" | "Suspended" | "Preview Guest" {
  if (member.isDemo) return "Preview Guest";
  if (member.suspended || member.revoked) return "Suspended";
  return "Active Member";
}

function demoWelcomeMessage(session: PublicSession): string {
  const name = session.firstName ?? session.fullName.split(/\s+/)[0] ?? "Guest";
  return `${name}, thank you for exploring Aurelius in preview — we hope you've felt the discretion and rigour our members rely on every day. If this experience resonates with how you steward wealth, we would be honoured to welcome you into the circle; our private office looks forward to the day you choose to join us.`;
}

function buildDemoIdentityCard(memberId: string, member: MemberSession, session: PublicSession) {
  return {
    fullName: session.fullName,
    memberNumber: `DEMO-${memberNumberFromId(memberId)}`,
    memberSince: formatMemberSince(member.createdAt),
    planBadge: "Demo · Principal Preview",
    validThrough: resolveValidThrough(member),
    status: resolveStatus(member),
    welcomeMessage: demoWelcomeMessage(session),
  };
}

async function getOrGenerateWelcome(
  memberId: string,
  member: MemberSession,
): Promise<string> {
  const stored = await readUserEncryptedFile<WelcomeStore>(memberId, WELCOME_FILE, {
    welcomeMessage: "",
    generatedAt: "",
  });

  if (stored.welcomeMessage.trim()) {
    return stored.welcomeMessage.trim();
  }

  const plan = resolvePlanBadge(member);
  const since = formatMemberSince(member.createdAt);
  const prompt = `You are Aurelius. Write a single elegant 2-sentence welcome message for a private wealth member.
Member name: ${member.fullName}. Plan: ${plan}. Member since: ${since}.
Make it warm, sophisticated, and make them feel like they belong to an exclusive circle.
No generic phrases. Speak like a private banker welcoming a valued client.`;

  let message = "";

  try {
    message = await createAureliusCompletion({
      system: "You are Aurelius. Write brief, elegant private banking welcome notes. Never mention AI providers.",
      messages: [{ role: "user", content: prompt }],
      feature: "general",
      maxTokens: 256,
    });
  } catch (err) {
    console.error("[Identity Card] Welcome message generation failed:", err);
  }

  if (!message.trim()) {
    message = `${member.fullName.split(" ")[0] ?? "Principal"}, your place in the Aurelius circle is reserved — we stand ready to steward your wealth with the discretion and rigour you expect.`;
  }

  await writeUserEncryptedFile(memberId, WELCOME_FILE, {
    welcomeMessage: message.trim(),
    generatedAt: new Date().toISOString(),
  });

  return message.trim();
}

export async function buildIdentityCard(memberId: string, session: PublicSession) {
  const store = await readStore();
  const member = store.members.find((m) => m.id === memberId);
  if (!member) {
    throw new Error("Member not found");
  }

  if (member.isDemo || session.isDemo) {
    return buildDemoIdentityCard(memberId, member, session);
  }

  const welcomeMessage = await getOrGenerateWelcome(memberId, member);

  return {
    fullName: session.fullName,
    memberNumber: memberNumberFromId(memberId),
    memberSince: formatMemberSince(member.createdAt),
    planBadge: resolvePlanBadge(member),
    validThrough: resolveValidThrough(member),
    status: resolveStatus(member),
    welcomeMessage,
  };
}
