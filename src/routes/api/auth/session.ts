import { createFileRoute } from "@tanstack/react-router";
import { resolveMemberSession } from "@/lib/auth/service.server";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await resolveMemberSession(request.headers.get("cookie"));
        if (!session) {
          return Response.json({ session: null }, { status: 401 });
        }
        return Response.json({ session });
      },
    },
  },
});
