import { createFileRoute } from "@tanstack/react-router";
import { isAdvisorAiConfigured } from "@/lib/ai/config.server";
import { ensureServerEnv } from "@/lib/env.server";
import { requireMemberSession } from "@/lib/auth/guard.server";

export const Route = createFileRoute("/api/chat/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        ensureServerEnv();
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        return Response.json({
          configured: isAdvisorAiConfigured(),
          brand: "Aurelius AI",
          demo: auth.session.isDemo
            ? {
                quotaDaily: auth.session.aiQuotaDaily ?? 5,
                quotaRemaining: auth.session.aiQuotaRemaining ?? 0,
                limitReached: (auth.session.aiQuotaRemaining ?? 0) <= 0,
              }
            : undefined,
        });
      },
    },
  },
});
