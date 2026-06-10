import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { generateMarketBrief } from "@/lib/market/brief.server";

export const Route = createFileRoute("/api/market-intel/brief")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Brief regeneration");
        }

        const brief = await generateMarketBrief(auth.session.email);
        return Response.json({ brief });
      },
    },
  },
});
