import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { deleteLegalEntity, entityAiFlags, listLegalEntities, upsertLegalEntity } from "@/lib/legal-entities/store.server";

export const Route = createFileRoute("/api/member/legal-entities")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const entities = await listLegalEntities(auth.session.email);
        const updatedAt = entities.reduce(
          (latest, e) => (e.updatedAt > latest ? e.updatedAt : latest),
          entities[0]?.updatedAt,
        );

        return Response.json({
          entities,
          aiFlags: entityAiFlags(entities),
          updatedAt,
        });
      },
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Legal entity editing");
        }

        const body = (await request.json().catch(() => ({}))) as {
          id?: string;
          name?: string;
          entityType?: import("@/lib/legal-entities/types").EntityType;
          role?: import("@/lib/legal-entities/types").EntityRole;
          shareholdingPercent?: number;
          estimatedValuation?: number;
          rocFilingDue?: string;
          notes?: string;
        };

        if (!body.name?.trim() || !body.entityType || !body.role) {
          return Response.json({ error: "Name, entity type, and role are required." }, { status: 400 });
        }

        const entity = await upsertLegalEntity(auth.session.email, {
          id: body.id,
          name: body.name,
          entityType: body.entityType,
          role: body.role,
          shareholdingPercent: body.shareholdingPercent,
          estimatedValuation: body.estimatedValuation,
          rocFilingDue: body.rocFilingDue,
          notes: body.notes,
        });

        const entities = await listLegalEntities(auth.session.email);
        return Response.json({ entity, aiFlags: entityAiFlags(entities) });
      },
      DELETE: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Legal entity deletion");
        }

        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return Response.json({ error: "Entity id required." }, { status: 400 });

        const ok = await deleteLegalEntity(auth.session.email, id);
        if (!ok) return Response.json({ error: "Entity not found." }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
