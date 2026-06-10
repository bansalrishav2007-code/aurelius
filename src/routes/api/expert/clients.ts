import { createFileRoute } from "@tanstack/react-router";
import { requireExpertSession } from "@/lib/experts/guard.server";
import { listExpertClients } from "@/lib/experts/relations.server";

export const Route = createFileRoute("/api/expert/clients")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireExpertSession(request);
        if (!auth.ok) return auth.response;

        const clients = await listExpertClients(auth.expert.id);
        return Response.json({ clients });
      },
    },
  },
});
