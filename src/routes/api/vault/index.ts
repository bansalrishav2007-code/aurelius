import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { listMemberDocuments } from "@/lib/vault/store.server";

export const Route = createFileRoute("/api/vault/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const docs = await listMemberDocuments(auth.session.email);
        return Response.json({ documents: docs });
      },
    },
  },
});
