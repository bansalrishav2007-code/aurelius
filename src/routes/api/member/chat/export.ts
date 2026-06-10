import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { exportConversationToVault } from "@/lib/chat/export.server";

export const Route = createFileRoute("/api/member/chat/export")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Export conversation");
        }

        const body = (await request.json().catch(() => ({}))) as {
          messages?: { role: "user" | "assistant"; content: string; createdAt?: string }[];
        };

        if (!body.messages?.length) {
          return Response.json({ error: "No messages to export." }, { status: 400 });
        }

        const clientName = auth.session.firstName ?? auth.session.fullName.split(/\s+/)[0] ?? "Principal";
        const doc = await exportConversationToVault(
          auth.session.email,
          clientName,
          body.messages.map((m, i) => ({
            id: `export-${i}`,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt ?? new Date().toISOString(),
          })),
        );

        return Response.json({ documentId: doc.id, name: doc.name });
      },
    },
  },
});
