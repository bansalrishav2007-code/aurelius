import { createFileRoute } from "@tanstack/react-router";
import { requireSuperAdmin } from "@/lib/auth/founder.service.server";
import { deleteExpert, updateExpert } from "@/lib/experts/store.server";
import type { ExpertCategory } from "@/lib/experts/types";

export const Route = createFileRoute("/api/founder/experts/$expertId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        if (!(await requireSuperAdmin(request.headers.get("cookie")))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }

        const body = (await request.json().catch(() => ({}))) as {
          name?: string;
          category?: ExpertCategory;
          yearsExperience?: number;
          specialization?: string;
          languages?: string[];
          rating?: number;
          clientsServed?: number;
          pricePaise?: number;
          exclusiveOnly?: boolean;
          status?: "active" | "inactive";
          portalEmail?: string;
          portalPassword?: string;
          bio?: string;
          availability?: import("@/lib/experts/types").ExpertAvailability;
        };

        const expert = await updateExpert(params.expertId, body);
        if (!expert) return Response.json({ error: "Expert not found." }, { status: 404 });
        return Response.json({ expert });
      },
      DELETE: async ({ request, params }) => {
        if (!(await requireSuperAdmin(request.headers.get("cookie")))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }
        const ok = await deleteExpert(params.expertId);
        if (!ok) return Response.json({ error: "Expert not found." }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
