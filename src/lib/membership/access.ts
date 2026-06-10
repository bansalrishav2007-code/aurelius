import type { InviteCode } from "@/lib/auth/types";

export type MembershipTier = InviteCode["tier"];

export type MembershipFeature =
  | "ai_advisor"
  | "vault"
  | "wealth_overview"
  | "market_intelligence"
  | "family_members"
  | "shared_vault"
  | "succession_planning"
  | "legal_entities"
  | "cap_table"
  | "holding_structure"
  | "dedicated_expert";

export const TIER_LABELS: Record<MembershipTier, string> = {
  principal: "Principal",
  founding: "Founder",
  "family-office": "Family Office",
};

export const TIER_USER_LIMITS: Record<MembershipTier, number> = {
  principal: 1,
  "family-office": 5,
  founding: 3,
};

const TIER_RANK: Record<MembershipTier, number> = {
  principal: 1,
  "family-office": 2,
  founding: 3,
};

const FEATURE_MIN_TIER: Record<MembershipFeature, MembershipTier> = {
  ai_advisor: "principal",
  vault: "principal",
  wealth_overview: "principal",
  market_intelligence: "principal",
  family_members: "family-office",
  shared_vault: "family-office",
  succession_planning: "family-office",
  legal_entities: "founding",
  cap_table: "founding",
  holding_structure: "founding",
  dedicated_expert: "founding",
};

export const FEATURE_LABELS: Record<MembershipFeature, string> = {
  ai_advisor: "AI Advisor",
  vault: "Document Vault",
  wealth_overview: "Wealth Overview",
  market_intelligence: "Market Intelligence",
  family_members: "Family Members",
  shared_vault: "Shared Family Vault",
  succession_planning: "Succession Planning",
  legal_entities: "Legal Entity Tracking",
  cap_table: "Cap Table",
  holding_structure: "Holding Structure Advice",
  dedicated_expert: "Dedicated Expert",
};

export const TIER_FEATURES: Record<MembershipTier, MembershipFeature[]> = {
  principal: ["ai_advisor", "vault", "wealth_overview", "market_intelligence"],
  "family-office": [
    "ai_advisor",
    "vault",
    "wealth_overview",
    "market_intelligence",
    "family_members",
    "shared_vault",
    "succession_planning",
  ],
  founding: [
    "ai_advisor",
    "vault",
    "wealth_overview",
    "market_intelligence",
    "family_members",
    "shared_vault",
    "succession_planning",
    "legal_entities",
    "cap_table",
    "holding_structure",
    "dedicated_expert",
  ],
};

export function tierMeetsRequirement(
  memberTier: MembershipTier,
  requiredTier: MembershipTier,
): boolean {
  return TIER_RANK[memberTier] >= TIER_RANK[requiredTier];
}

export function canAccessFeature(memberTier: MembershipTier, feature: MembershipFeature): boolean {
  return tierMeetsRequirement(memberTier, FEATURE_MIN_TIER[feature]);
}

export function requiredTierForFeature(feature: MembershipFeature): MembershipTier {
  return FEATURE_MIN_TIER[feature];
}

export function upgradeLabelForFeature(feature: MembershipFeature): string {
  return TIER_LABELS[FEATURE_MIN_TIER[feature]];
}
