import type { AssetCategory } from "./types";

/** Hex colors for charts and UI — Recharts/SVG cannot resolve CSS variables. */
export const CATEGORY_COLORS: Record<AssetCategory, string> = {
  equity: "#4A90D9",
  real_estate: "#8B5CF6",
  gold: "#C9A84C",
  cash_fd: "#2DD4BF",
  legal_entity: "#F97316",
  other: "#6B7280",
};

export const LIABILITY_COLOR = "#EF4444";
export const EMPTY_DONUT_COLOR = "#6B7280";

export function getCategoryColor(category: AssetCategory | string): string {
  if (category in CATEGORY_COLORS) {
    return CATEGORY_COLORS[category as AssetCategory];
  }
  return EMPTY_DONUT_COLOR;
}

export function briefPdfFileName(date = new Date()): string {
  const slug = date.toISOString().slice(0, 10);
  return `Aurelius_Brief_${slug}.pdf`;
}
