import type { FamilyMember } from "./types";

export function buildFamilyInsights(members: FamilyMember[], familyNetWorth: number): string[] {
  const tips: string[] = [];

  const unused80C = members.filter((m) => (m.unused80CLimit ?? 0) >= 50_000);
  if (unused80C.length > 0) {
    tips.push(
      `${unused80C.map((m) => m.name).join(", ")} — unused 80C headroom detected. Route ELSS/PPF contributions through these members.`,
    );
  }

  if (members.length >= 2 && familyNetWorth >= 1_00_00_000) {
    tips.push("Income splitting: consider shifting interest income to lower-bracket family members within clubbing rules.");
  }

  if (members.length === 0) {
    tips.push("Add spouse and children to model combined family tax optimisation.");
  }

  return tips;
}
