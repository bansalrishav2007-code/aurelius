import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { listMemberGoals } from "@/lib/goals/store.server";
import { listFamilyMembers } from "@/lib/family/store.server";
import { listMemberDocuments } from "@/lib/vault/store.server";
import { getOrCreateProfile } from "@/lib/wealth/store.server";
import { getSuccessionPlan } from "@/lib/succession/store.server";
import { listLegalEntities } from "@/lib/legal-entities/store.server";

export const Route = createFileRoute("/api/member/security/export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const email = auth.session.email;
        const [goals, family, vault, wealth, succession, entities] = await Promise.all([
          listMemberGoals(email),
          listFamilyMembers(email),
          listMemberDocuments(email),
          getOrCreateProfile(email),
          getSuccessionPlan(email),
          listLegalEntities(email),
        ]);

        const exportData = {
          exportedAt: new Date().toISOString(),
          memberEmail: email,
          goals,
          family,
          vault: vault.map((d) => ({ ...d, analysis: d.analysis ? "[redacted summary]" : undefined })),
          wealth,
          succession,
          entities,
        };

        return new Response(JSON.stringify(exportData, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="aurelius-export-${new Date().toISOString().slice(0, 10)}.json"`,
          },
        });
      },
    },
  },
});
