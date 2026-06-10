import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { exportIntelligenceBriefPdf } from "@/lib/wealth/brief-download.server";

export const Route = createFileRoute("/api/member/wealth-overview/brief-download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        if (auth.session.isDemo) {
          const { demoLockedResponse } = await import("@/lib/demo/service.server");
          return demoLockedResponse("Intelligence brief download");
        }

        const result = await exportIntelligenceBriefPdf(auth.session.email);
        if ("error" in result) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        return new Response(result.buffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${result.fileName}"`,
            "Content-Length": String(result.buffer.length),
            "X-Vault-Document-Id": result.vaultDocumentId,
          },
        });
      },
    },
  },
});
