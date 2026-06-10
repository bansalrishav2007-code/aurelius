import { mockAllocation, mockRecommendations, mockAdvisors } from "@/lib/mock-data";

export const DEMO_PURPOSE_OPTIONS = [
  "Tax planning",
  "CA / Accounting",
  "Legal structuring",
  "Investment tracking",
  "Family office management",
] as const;

export type DemoPurpose = (typeof DEMO_PURPOSE_OPTIONS)[number];

export const demoPortfolioOverview = {
  netWorth: "₹142 Cr",
  liquidAum: "₹38 Cr",
  entities: 6,
  allocation: mockAllocation,
};

export const demoTaxInsights = mockRecommendations.map((r) => ({
  title: r.title,
  impact: r.impact,
  tag: r.tag,
}));

export const demoAdvisorNotes = mockAdvisors.slice(0, 3).map((a) => ({
  name: a.name,
  role: a.role,
  note:
    a.role === "Chartered Accountant"
      ? "Advance tax projection reviewed — Q3 instalment optimised by ₹14L."
      : a.role === "Tax Lawyer"
        ? "GST notice response draft prepared — hearing scheduled."
        : "Portfolio rebalancing memo circulated to family office principals.",
}));

export const demoLockedModules = [
  {
    id: "wealth-engine",
    title: "Wealth Structuring Engine",
    description: "Multi-entity mapping, succession trees, and cross-border exposure modelling.",
    icon: "landmark" as const,
  },
  {
    id: "advisor-layer",
    title: "Advisor Coordination Layer",
    description: "Unified CA, legal, and wealth advisor workflows with shared context.",
    icon: "users" as const,
  },
  {
    id: "document-vault",
    title: "Document Vault",
    description: "AES-256 encrypted vault with AI-indexed ITR, deeds, and compliance files.",
    icon: "folder" as const,
  },
  {
    id: "portfolio-intel",
    title: "Portfolio Intelligence System",
    description: "Real-time holdings, promoter stakes, and alternative asset intelligence.",
    icon: "chart" as const,
  },
];
