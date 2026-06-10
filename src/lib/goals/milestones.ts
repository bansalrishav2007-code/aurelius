import type { GoalCategory } from "./categories";
import type { GoalMilestone } from "./types";

export function suggestMilestones(title: string, category?: GoalCategory): GoalMilestone[] {
  const cat = category?.toLowerCase() ?? "";
  const base = title.trim();

  const templates: Record<string, string[]> = {
    "tax planning": ["Gather FY documents", "Review 80C/80D headroom", "File returns on time"],
    property: ["Define budget & location", "Secure pre-approval", "Complete due diligence", "Close purchase"],
    investment: ["Set asset allocation", "Open SIP/account", "Review quarterly", "Rebalance annually"],
    retirement: ["Estimate corpus needed", "Maximise NPS/EPF", "Build equity SIP", "Review 5 years before target"],
    education: ["Estimate total cost", "Open education fund", "Shift to debt 2 years before", "Fund first year fees"],
    business: ["Define capital requirement", "Structure entity", "Secure funding", "Launch milestone"],
  };

  let steps = templates[cat] ?? ["Define target amount", "Set monthly savings plan", "Track progress monthly", "Review with advisor"];

  if (base.toLowerCase().includes("home") || base.toLowerCase().includes("property")) {
    steps = templates.property;
  }

  return steps.map((title, i) => ({
    id: `ms-${i}`,
    title,
    completed: false,
  }));
}
