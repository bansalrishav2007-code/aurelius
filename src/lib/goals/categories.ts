export const GOAL_CATEGORIES = [
  "Tax",
  "Legal",
  "Investment",
  "Property",
  "Retirement",
  "Education",
  "Business",
  "Other",
] as const;

export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

/** Legacy category labels stored before rename */
export const LEGACY_GOAL_CATEGORY_MAP: Record<string, GoalCategory> = {
  "Tax Planning": "Tax",
  "Legal Structure": "Legal",
};

export function normalizeGoalCategory(category?: string): GoalCategory {
  if (!category) return "Other";
  if ((GOAL_CATEGORIES as readonly string[]).includes(category)) return category as GoalCategory;
  return LEGACY_GOAL_CATEGORY_MAP[category] ?? "Other";
}
