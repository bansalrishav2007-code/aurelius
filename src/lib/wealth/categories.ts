import type { ComponentType } from "react";
import {
  Briefcase,
  Building2,
  Car,
  CircleDot,
  CreditCard,
  GraduationCap,
  Home,
  Landmark,
  User,
} from "lucide-react";
import type { AssetCategory, LiabilityType } from "./types";
import { CATEGORY_COLORS } from "./colors";

export const ASSET_CATEGORY_META: Record<
  AssetCategory,
  { label: string; color: string }
> = {
  equity: { label: "Equity", color: CATEGORY_COLORS.equity },
  real_estate: { label: "Real Estate", color: CATEGORY_COLORS.real_estate },
  gold: { label: "Gold", color: CATEGORY_COLORS.gold },
  cash_fd: { label: "Cash/FD", color: CATEGORY_COLORS.cash_fd },
  legal_entity: { label: "Legal Entities", color: CATEGORY_COLORS.legal_entity },
  other: { label: "Other", color: CATEGORY_COLORS.other },
};

export const ASSET_CATEGORY_OPTIONS = Object.entries(ASSET_CATEGORY_META).map(([value, meta]) => ({
  value: value as AssetCategory,
  label: meta.label,
}));

const LIABILITY_TYPE_META: Record<
  LiabilityType,
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  home_loan: { label: "Home Loan", icon: Home },
  car_loan: { label: "Car Loan", icon: Car },
  personal_loan: { label: "Personal Loan", icon: User },
  business_loan: { label: "Business Loan", icon: Briefcase },
  mortgage: { label: "Mortgage", icon: Building2 },
  credit_card: { label: "Credit Card", icon: CreditCard },
  education_loan: { label: "Education Loan", icon: GraduationCap },
  other: { label: "Other", icon: CircleDot },
  loan: { label: "Loan", icon: Landmark },
  credit: { label: "Credit", icon: CreditCard },
};

export const LIABILITY_TYPE_OPTIONS = [
  { value: "home_loan" as const, label: "Home Loan" },
  { value: "car_loan" as const, label: "Car Loan" },
  { value: "personal_loan" as const, label: "Personal Loan" },
  { value: "business_loan" as const, label: "Business Loan" },
  { value: "mortgage" as const, label: "Mortgage" },
  { value: "credit_card" as const, label: "Credit Card" },
  { value: "education_loan" as const, label: "Education Loan" },
  { value: "other" as const, label: "Other" },
];

export function getLiabilityTypeMeta(type: LiabilityType) {
  return LIABILITY_TYPE_META[type] ?? LIABILITY_TYPE_META.other;
}

export function normalizeLiabilityType(type: string): LiabilityType {
  if (type in LIABILITY_TYPE_META) return type as LiabilityType;
  if (type === "loan") return "home_loan";
  if (type === "credit") return "credit_card";
  return "other";
}

const ASSET_NAME_RULES: [RegExp, AssetCategory][] = [
  [/\b(tv|car|bike|jewellery|jewelry|art|watch)\b/i, "other"],
  [/\b(house|plot|flat|property|land)\b/i, "real_estate"],
  [/\b(gold|silver)\b/i, "gold"],
  [/\b(fd|cash|savings)\b/i, "cash_fd"],
  [/\b(shares|mf|stocks)\b/i, "equity"],
];

export function suggestAssetCategory(name: string): AssetCategory | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  for (const [pattern, category] of ASSET_NAME_RULES) {
    if (pattern.test(trimmed)) return category;
  }
  return null;
}

export const WEALTH_DOCUMENT_TYPES = [
  { value: "itr" as const, label: "ITR" },
  { value: "ca_statement" as const, label: "CA statement" },
  { value: "bank_statement" as const, label: "Bank statement" },
  { value: "mf_statement" as const, label: "MF statement" },
  { value: "nsdl_cas" as const, label: "NSDL CAS" },
  { value: "other" as const, label: "Other financial document" },
];
