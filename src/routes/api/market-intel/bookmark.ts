import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { saveIntelligenceBookmark } from "@/lib/market/bookmarks.server";

export const Route = createFileRoute("/api/market-intel/bookmark")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Saving bookmarks");
        }

        const body = (await request.json().catch(() => ({}))) as {
          headline?: string;
          url?: string;
          source?: string;
          description?: string;
          briefContent?: string;
        };

        if (body.briefContent) {
          await saveIntelligenceBookmark(auth.session.email, {
            name: `Intelligence Brief — ${new Date().toLocaleDateString("en-IN")}`,
            content: body.briefContent,
            type: "brief",
          });
        } else if (body.headline && body.url) {
          await saveIntelligenceBookmark(auth.session.email, {
            name: body.headline.slice(0, 80),
            content: `${body.headline}\n\nSource: ${body.source ?? "News"}\n${body.description ?? ""}\n\n${body.url}`,
            type: "article",
            url: body.url,
          });
        } else {
          return Response.json({ error: "Invalid bookmark payload." }, { status: 400 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
