import { createFileRoute } from "@tanstack/react-router";
import { requireSuperAdmin } from "@/lib/auth/founder.service.server";
import {
  createExpert,
  getExpertRevenueSummary,
  listAllExperts,
  ensureExpertPortalSeeds,
} from "@/lib/experts/store.server";
import type { ExpertCategory } from "@/lib/experts/types";

export const Route = createFileRoute("/api/founder/experts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await requireSuperAdmin(request.headers.get("cookie")))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }
        await ensureExpertPortalSeeds();
        const experts = await listAllExperts();
        const revenue = await getExpertRevenueSummary();
        return Response.json({ experts, revenue });
      },
      POST: async ({ request }) => {
        if (!(await requireSuperAdmin(request.headers.get("cookie")))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }

        const body = (await request.json().catch(() => ({}))) as {
          name?: string;
          category?: ExpertCategory;
          yearsExperience?: number;
          specialization?: string;
          languages?: string[];
          pricePaise?: number;
          exclusiveOnly?: boolean;
          portalEmail?: string;
          portalPassword?: string;
          bio?: string;
        };

        if (!body.name?.trim() || !body.category || !body.portalEmail || !body.portalPassword) {
          return Response.json({ error: "Name, category, portal email and password are required." }, { status: 400 });
        }

        try {
          const expert = await createExpert({
            name: body.name,
            category: body.category,
            yearsExperience: body.yearsExperience ?? 5,
            specialization: body.specialization ?? "General advisory",
            languages: body.languages ?? ["English"],
            pricePaise: body.pricePaise ?? 249_900,
            exclusiveOnly: body.exclusiveOnly,
            portalEmail: body.portalEmail,
            portalPassword: body.portalPassword,
            bio: body.bio,
          });
          return Response.json({ expert });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Failed to create expert." }, { status: 400 });
        }
      },
    },
  },
});
