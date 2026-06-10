import { computeWealthSummary } from "./calculations";
import { buildDemoIntelligenceReport } from "./intelligence.server";
import type { MemberWealthProfile, WealthOverviewSummary } from "./types";

export function buildDemoWealthOverview(email: string, fullName = "Principal"): WealthOverviewSummary {
  const now = new Date().toISOString();
  const profile: MemberWealthProfile = {
    memberEmail: email.toLowerCase(),
    updatedAt: now,
    assets: [
      {
        id: "demo-asset-1",
        memberEmail: email,
        name: "Listed equity portfolio",
        category: "equity",
        value: 4_20_00_000,
        dateAdded: "2025-04-01",
        notes: "NSE holdings via demat",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-asset-2",
        memberEmail: email,
        name: "Bandra commercial property",
        category: "real_estate",
        value: 8_50_00_000,
        dateAdded: "2024-11-15",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-asset-3",
        memberEmail: email,
        name: "Gold — SGB + physical",
        category: "gold",
        value: 45_00_000,
        dateAdded: "2025-01-10",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-asset-4",
        memberEmail: email,
        name: "Liquid FD ladder",
        category: "cash_fd",
        value: 1_20_00_000,
        dateAdded: "2025-06-01",
        createdAt: now,
        updatedAt: now,
      },
    ],
    liabilities: [
      {
        id: "demo-liability-1",
        memberEmail: email,
        name: "Home loan — HDFC",
        type: "mortgage",
        value: 1_85_00_000,
        dateAdded: "2022-03-01",
        createdAt: now,
        updatedAt: now,
      },
    ],
    legalEntities: [
      {
        id: "demo-entity-1",
        memberEmail: email,
        name: "Aurelius Holdings Pvt Ltd",
        entityType: "Private Ltd",
        value: 2_10_00_000,
        updatedAt: now,
      },
      {
        id: "demo-entity-2",
        memberEmail: email,
        name: "Family discretionary trust",
        entityType: "Trust",
        updatedAt: now,
      },
    ],
    taxSnapshot: {
      assessmentYear: "2024-25",
      totalIncome: 3_42_00_000,
      taxPaid: 78_50_000,
      estimatedTaxFy: 82_00_000,
      stcg: 12_00_000,
      ltcg: 28_00_000,
      used80C: 1_20_000,
      limit80C: 1_50_000,
      used80D: 18_000,
      limit80D: 25_000,
      refundDue: 0,
      notes: "From ITR AY 2024-25 — demo data",
      aiExtracted: true,
      updatedAt: now,
    },
    portfolioSnapshots: [
      { at: new Date(Date.now() - 90 * 86_400_000).toISOString(), netWorth: 11_50_00_000, totalAssets: 13_35_00_000, totalLiabilities: 1_85_00_000 },
      { at: new Date(Date.now() - 60 * 86_400_000).toISOString(), netWorth: 12_10_00_000, totalAssets: 13_95_00_000, totalLiabilities: 1_85_00_000 },
      { at: new Date(Date.now() - 30 * 86_400_000).toISOString(), netWorth: 12_40_00_000, totalAssets: 14_25_00_000, totalLiabilities: 1_85_00_000 },
      { at: now, netWorth: 12_50_00_000, totalAssets: 14_35_00_000, totalLiabilities: 1_85_00_000 },
    ],
    netWorthSnapshots: [
      { month: "2025-11", netWorth: 12_10_00_000 },
      { month: "2025-12", netWorth: 12_40_00_000 },
      { month: "2026-01", netWorth: 12_50_00_000 },
    ],
  };

  const summary = computeWealthSummary(profile);
  summary.profile.intelligenceReport = buildDemoIntelligenceReport(fullName, summary);
  return summary;
}
