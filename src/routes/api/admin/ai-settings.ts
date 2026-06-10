import { createFileRoute } from "@tanstack/react-router";
import { resolveAdminSession } from "@/lib/auth/service.server";
import { getAiCostSummary } from "@/lib/ai/cost-tracking.server";
import { getAiSettings, setAiPrimaryProvider, type AiPrimaryProvider } from "@/lib/ai/settings.server";

export const Route = createFileRoute("/api/admin/ai-settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authed = await resolveAdminSession(request.headers.get("cookie"));
        if (!authed) return Response.json({ error: "Admin session required." }, { status: 401 });
        const [settings, costs] = await Promise.all([getAiSettings(), getAiCostSummary()]);
        return Response.json({ settings, costs });
      },
      PATCH: async ({ request }) => {
        const authed = await resolveAdminSession(request.headers.get("cookie"));
        if (!authed) return Response.json({ error: "Admin session required." }, { status: 401 });
        const body = (await request.json().catch(() => ({}))) as {
          primaryProvider?: AiPrimaryProvider;
        };
        if (!body.primaryProvider || !["claude", "gpt", "both"].includes(body.primaryProvider)) {
          return Response.json({ error: "primaryProvider must be claude, gpt, or both." }, { status: 400 });
        }
        const settings = await setAiPrimaryProvider(body.primaryProvider);
        return Response.json({ ok: true, settings });
      },
    },
  },
});
