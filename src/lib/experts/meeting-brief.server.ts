import { buildAureliusAdvisorSystemPrompt } from "@/lib/ai/advisor-prompt.server";
import { createAureliusCompletion } from "@/lib/ai/router.server";
import { getMemberWealthOverview } from "@/lib/wealth/store.server";
import { formatInr } from "@/lib/wealth/calculations";
import { listMemberGoals } from "@/lib/goals/store.server";
import { listMemberDocuments } from "@/lib/vault/store.server";
import type { ExpertBooking, ExpertProfile } from "./types";
import { SERVICE_TYPE_LABELS } from "./service-types";

export async function generatePreMeetingBrief(
  booking: ExpertBooking,
  expert: ExpertProfile,
): Promise<string> {
  const overview = await getMemberWealthOverview(booking.memberEmail).catch(() => null);
  const goals = await listMemberGoals(booking.memberEmail).catch(() => []);
  const docs = await listMemberDocuments(booking.memberEmail).catch(() => []);

  const service = SERVICE_TYPE_LABELS[booking.serviceType] ?? "Consultation";
  const when = new Date(booking.scheduledAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  const healthScore = overview?.healthScore?.score;
  const snapshot = overview
    ? `Net Worth: ${formatInr(overview.netWorth)} · Health Score: ${healthScore ?? "—"}/100 · Top asset: ${overview.allocation[0]?.name ?? "—"} (${overview.allocation[0]?.percent ?? 0}%)`
    : "Wealth data not yet shared by client.";

  const docList = docs.slice(0, 5).map((d) => d.name).join(", ") || "None shared";

  const userPrompt = `Generate a confidential pre-meeting briefing memo for expert ${expert.name}.

CLIENT: ${booking.memberName} · Tier ${booking.memberTier}
MEETING: ${service} · ${booking.durationMinutes} min · ${when}
WEALTH SNAPSHOT: ${snapshot}
AGENDA: ${booking.agenda ?? "General consultation"}
ACTIVE GOALS: ${goals.slice(0, 3).map((g) => g.title).join("; ") || "None"}
VAULT DOCUMENTS: ${docList}

Format as a professional memo with: CLIENT WEALTH SNAPSHOT, AGENDA, KEY ISSUES (3-4 with ₹ amounts), SUGGESTED TALKING POINTS, DOCUMENTS IN VAULT.
End with: "NOTE: Client has approved sharing this brief with you."`;

  try {
    const system = buildAureliusAdvisorSystemPrompt({
      clientName: booking.memberName,
      tier: booking.memberTier as import("../auth/types").InviteCode["tier"],
      feature: "expert_briefing",
      wealthBlock: snapshot,
    });
    const text = await createAureliusCompletion({
      system,
      messages: [{ role: "user", content: userPrompt }],
      feature: "expert_briefing",
      memberEmail: booking.memberEmail,
      maxTokens: 1500,
    });
    return text.trim();
  } catch {
    return `CONFIDENTIAL BRIEFING\nClient: ${booking.memberName}\nMeeting: ${service} · ${booking.durationMinutes} min\n${when}\n\n${snapshot}\n\nAgenda: ${booking.agenda ?? "—"}\n\nDocuments: ${docList}`;
  }
}
