import { getMemberWealthOverview } from "@/lib/wealth/store.server";
import { formatInr } from "@/lib/wealth/calculations";
import { listMemberGoals } from "@/lib/goals/store.server";

/** Build a one-line wealth brief for an expert — only call when client has approved vault sharing. */
export async function buildClientWealthBriefForExpert(
  memberEmail: string,
  mainConcern?: string,
): Promise<string> {
  const overview = await getMemberWealthOverview(memberEmail).catch(() => null);
  const goals = await listMemberGoals(memberEmail).catch(() => []);

  if (!overview || overview.totalAssets === 0) {
    return mainConcern
      ? `This client has not completed their wealth overview yet. Main concern: ${mainConcern}.`
      : "This client has not shared wealth data yet.";
  }

  const topAllocation = overview.allocation[0];
  const tax = overview.profile.taxSnapshot;
  const goalLine = goals.length ? `Active goals: ${goals.slice(0, 2).map((g) => g.title).join("; ")}.` : "";

  const parts = [
    `Net worth ${formatInr(overview.netWorth)}`,
    topAllocation ? `largest holding ${topAllocation.name} (${topAllocation.percent}%)` : "",
    tax?.totalIncome ? `reported income ${formatInr(tax.totalIncome)}` : "",
    mainConcern ? `main concern: ${mainConcern}` : "",
    goalLine,
  ].filter(Boolean);

  return `This client has ${parts.join(" · ")}`;
}
