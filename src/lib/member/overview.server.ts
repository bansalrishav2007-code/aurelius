import { resolveMemberSession } from "@/lib/auth/service.server";
import { readStore } from "@/lib/auth/store.server";
import { listMemberGoals } from "@/lib/goals/store.server";
import { listSupportTickets } from "@/lib/support/store.server";
import { listMemberDocuments } from "@/lib/vault/store.server";
import { listConversations } from "@/lib/chat/conversations.server";
import { computeWealthInsights } from "@/lib/wealth/insights";

export async function getMemberOverview(cookieHeader: string | null) {
  const session = await resolveMemberSession(cookieHeader);
  if (!session) return null;

  if (session.isDemo) {
    const { buildDemoOverview } = await import("@/lib/demo/mock-overview.server");
    return buildDemoOverview(session);
  }

  const email = session.email.toLowerCase();
  const store = await readStore();
  const member = store.members.find((m) => m.email === email);

  const [myDocs, conversations, goals, tickets] = await Promise.all([
    listMemberDocuments(email),
    listConversations(email),
    listMemberGoals(email),
    listSupportTickets(),
  ]);
  const myTickets = tickets.filter((t) => t.email === email);
  const recentDocs = [...myDocs].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0, 5);
  const recentChats = [...conversations]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
      messageCount: c.messages.length,
    }));

  return {
    session,
    member: member
      ? {
          createdAt: member.createdAt,
          expiresAt: member.expiresAt,
          subscription: member.subscription ?? "none",
          subscriptionPlan: member.subscriptionPlan,
        }
      : null,
    stats: {
      documentCount: myDocs.length,
      conversationCount: conversations.length,
      activeGoals: goals.filter((g) => g.status === "active").length,
      openTickets: myTickets.filter((t) => t.status === "open").length,
    },
    recentDocuments: recentDocs.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      uploadedAt: d.uploadedAt,
      status: d.status,
    })),
    recentConversations: recentChats,
    activeGoals: goals.filter((g) => g.status === "active").slice(0, 5),
    wealth: computeWealthInsights({
      categories: myDocs.map((d) => d.category),
      goalCount: goals.filter((g) => g.status === "active").length,
      analyzedCount: myDocs.filter((d) => d.status === "analyzed").length,
    }),
  };
}
