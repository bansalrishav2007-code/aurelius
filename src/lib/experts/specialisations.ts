import type { ExpertCategory } from "./types";

export type ExpertSpecialisationTag = "tax" | "legal" | "wealth" | "succession" | "family-office";

export const SPECIALISATION_FILTERS: { label: string; value: ExpertSpecialisationTag | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Tax", value: "tax" },
  { label: "Legal", value: "legal" },
  { label: "Wealth Planning", value: "wealth" },
  { label: "Family Office", value: "family-office" },
  { label: "Succession", value: "succession" },
];

export const CATEGORY_SPECIALISATIONS: Record<ExpertCategory, ExpertSpecialisationTag[]> = {
  "chartered-accountant": ["tax", "wealth"],
  "tax-consultant": ["tax"],
  "corporate-lawyer": ["legal", "family-office"],
  "startup-lawyer": ["legal"],
  "estate-planning-lawyer": ["legal", "succession"],
  "financial-advisor": ["wealth", "family-office"],
};

export const SPECIALISATION_LABELS: Record<ExpertSpecialisationTag, string> = {
  tax: "Tax",
  legal: "Legal",
  wealth: "Wealth",
  succession: "Succession",
  "family-office": "Family Office",
};

export function expertSpecialisationTags(category: ExpertCategory): ExpertSpecialisationTag[] {
  return CATEGORY_SPECIALISATIONS[category] ?? ["wealth"];
}
