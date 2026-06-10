import type { PublicSession } from "@/lib/auth/types";
import type { MemberGoal } from "@/lib/goals/types";
import {
  mockAllocation,
  mockChatHistory,
  mockDocuments,
  mockLiabilityTrend,
} from "@/lib/mock-data";

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function buildDemoOverview(session: PublicSession) {
  const activeGoals: MemberGoal[] = [
    {
      id: "demo-goal-1",
      memberEmail: session.email,
      title: "Optimise LTCG before March 2026",
      description: "Harvest gains across listed equity holdings",
      targetDate: "2026-03-15",
      status: "active",
      createdAt: daysAgoIso(14),
      updatedAt: daysAgoIso(2),
    },
    {
      id: "demo-goal-2",
      memberEmail: session.email,
      title: "Family trust structuring review",
      status: "active",
      createdAt: daysAgoIso(21),
      updatedAt: daysAgoIso(5),
    },
    {
      id: "demo-goal-3",
      memberEmail: session.email,
      title: "Advance tax planning — Q4",
      targetDate: "2025-12-15",
      status: "active",
      createdAt: daysAgoIso(7),
      updatedAt: daysAgoIso(1),
    },
  ];

  return {
    session,
    member: {
      createdAt: daysAgoIso(0),
      expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      subscription: "none" as const,
    },
    stats: {
      documentCount: mockDocuments.length,
      conversationCount: mockChatHistory.length,
      activeGoals: activeGoals.length,
      openTickets: 0,
    },
    recentDocuments: mockDocuments.slice(0, 5).map((doc, index) => ({
      id: `demo-doc-${doc.id}`,
      name: doc.name,
      category: doc.category,
      uploadedAt: daysAgoIso(index * 3 + 1),
      status: "analyzed",
    })),
    recentConversations: mockChatHistory.map((chat, index) => ({
      id: `demo-chat-${chat.id}`,
      title: chat.title,
      updatedAt: daysAgoIso(index * 2),
      messageCount: 4 + index,
    })),
    activeGoals,
    wealth: {
      allocation: mockAllocation,
      liabilityTrend: mockLiabilityTrend,
      hasData: true,
    },
  };
}
