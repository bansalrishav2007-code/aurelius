import type { ExpertProfile } from "./types";

export type MemberTier = "founding" | "principal" | "family-office";

export function getConsultationDiscount(tier: MemberTier): number {
  switch (tier) {
    case "founding":
      return 0.2;
    case "family-office":
      return 0.15;
    case "principal":
      return 0.1;
    default:
      return 0;
  }
}

export function hasPriorityBooking(tier: MemberTier): boolean {
  return tier === "founding" || tier === "family-office";
}

export function canBookExpert(expert: ExpertProfile, tier: MemberTier): boolean {
  if (expert.status !== "active") return false;
  if (expert.exclusiveOnly && tier !== "founding" && tier !== "family-office") return false;
  return true;
}

export function calculateBookingPrice(expert: ExpertProfile, tier: MemberTier) {
  const amountPaise = expert.pricePaise;
  const discountRate = getConsultationDiscount(tier);
  const discountPaise = Math.round(amountPaise * discountRate);
  const finalAmountPaise = amountPaise - discountPaise;
  return {
    amountPaise,
    discountPaise,
    finalAmountPaise,
    priorityBooking: hasPriorityBooking(tier),
    discountPercent: Math.round(discountRate * 100),
  };
}

export function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
