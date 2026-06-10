import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { deleteAllAiMemory, readAiMemory } from "@/lib/privacy/memory.server";

export const Route = createFileRoute("/api/member/privacy/memory")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const memory = await readAiMemory(auth.memberId, auth.session.email);
        return Response.json({
          entryCount: memory.entries.length,
          updatedAt: memory.updatedAt,
        });
      },
      DELETE: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("AI memory management");
        }

        await deleteAllAiMemory(auth.memberId, auth.session.email);
        return Response.json({ ok: true });
      },
    },
  },
});
