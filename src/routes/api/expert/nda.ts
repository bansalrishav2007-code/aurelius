import { createFileRoute } from "@tanstack/react-router";
import { requireExpertSession } from "@/lib/experts/guard.server";
import { signExpertNda } from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/expert/nda")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireExpertSession(request);
        if (!auth.ok) return auth.response;

        const ok = await signExpertNda(auth.session.email);
        if (!ok) return Response.json({ error: "Expert profile not found." }, { status: 404 });
        return Response.json({ ok: true, signedAt: new Date().toISOString() });
      },
    },
  },
});
