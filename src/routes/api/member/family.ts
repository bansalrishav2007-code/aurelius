import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { buildFamilyInsights } from "@/lib/family/insights";
import { deleteFamilyMember, listFamilyMembers, upsertFamilyMember } from "@/lib/family/store.server";
import { getOrCreateProfile } from "@/lib/wealth/store.server";
import { computeWealthSummary } from "@/lib/wealth/calculations";

export const Route = createFileRoute("/api/member/family")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const members = await listFamilyMembers(auth.session.email);
        const profile = await getOrCreateProfile(auth.session.email);
        const wealth = computeWealthSummary(profile);
        const updatedAt = members.reduce(
          (latest, m) => (m.updatedAt > latest ? m.updatedAt : latest),
          members[0]?.updatedAt ?? new Date().toISOString(),
        );

        return Response.json({
          members,
          familyNetWorth: wealth.netWorth,
          aiInsights: buildFamilyInsights(members, wealth.netWorth),
          updatedAt: members.length > 0 ? updatedAt : undefined,
        });
      },
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Family member editing");
        }

        const body = (await request.json().catch(() => ({}))) as {
          id?: string;
          name?: string;
          relation?: string;
          pan?: string;
          dob?: string;
          accessLevel?: "view" | "full";
          unused80CLimit?: number;
        };

        if (!body.name?.trim() || !body.relation?.trim()) {
          return Response.json({ error: "Name and relation are required." }, { status: 400 });
        }

        const member = await upsertFamilyMember(auth.session.email, {
          id: body.id,
          name: body.name,
          relation: body.relation,
          pan: body.pan,
          dob: body.dob,
          accessLevel: body.accessLevel ?? "view",
          unused80CLimit: body.unused80CLimit,
        });

        return Response.json({ member });
      },
      DELETE: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Family member deletion");
        }

        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return Response.json({ error: "Member id required." }, { status: 400 });

        const ok = await deleteFamilyMember(auth.session.email, id);
        if (!ok) return Response.json({ error: "Member not found." }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
