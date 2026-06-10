import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { saveAdvisorResponseToVault } from "@/lib/chat/save-response.server";

export const Route = createFileRoute("/api/member/chat/save-response")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Saving to vault");
        }

        const body = (await request.json().catch(() => ({}))) as { title?: string; content?: string };
        if (!body.content?.trim()) {
          return Response.json({ error: "Content is required." }, { status: 400 });
        }

        const doc = await saveAdvisorResponseToVault(
          auth.session.email,
          body.title?.trim() || "Advisor response",
          body.content.trim(),
        );

        return Response.json({ documentId: doc.id, name: doc.name });
      },
    },
  },
});
