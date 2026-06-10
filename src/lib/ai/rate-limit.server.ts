import type { InviteCode } from "@/lib/auth/types";
import { countMemberUsageToday, trackUsage } from "@/lib/usage/store.server";

const DAILY_LIMITS: Record<InviteCode["tier"], number | null> = {
  principal: 50,
  "family-office": 100,
  founding: null,
};

export type RateLimitResult =
  | { allowed: true; remaining: number | null }
  | { allowed: false; limit: number; resetsAt: string };

function midnightTonightIso(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

export async function checkAiRateLimit(
  memberEmail: string,
  tier: InviteCode["tier"],
): Promise<RateLimitResult> {
  const limit = DAILY_LIMITS[tier];
  if (limit == null) return { allowed: true, remaining: null };

  const todayChat = await countMemberUsageToday(memberEmail, "chat");

  if (todayChat >= limit) {
    return { allowed: false, limit, resetsAt: midnightTonightIso() };
  }

  return { allowed: true, remaining: limit - todayChat };
}

export async function consumeAiQuery(memberEmail: string): Promise<void> {
  await trackUsage(memberEmail, "chat");
}

export const AI_RATE_LIMIT_MESSAGE =
  "You've reached today's AI limit. Your limit resets at midnight. Contact support to upgrade.";
