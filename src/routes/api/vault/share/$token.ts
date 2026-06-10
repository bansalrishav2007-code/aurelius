import { createFileRoute } from "@tanstack/react-router";
import { resolveVaultShare } from "@/lib/vault/share.server";

export const Route = createFileRoute("/api/vault/share/$token")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const ua = request.headers.get("user-agent") ?? undefined;
        const resolved = await resolveVaultShare(params.token, ua);
        if (!resolved) {
          return Response.json({ error: "Link expired, already used, or invalid." }, { status: 404 });
        }

        return new Response(resolved.buffer, {
          headers: {
            "Content-Type": resolved.doc.mimeType,
            "Content-Disposition": `inline; filename="${resolved.doc.name.replace(/"/g, "")}"`,
            "Content-Length": String(resolved.buffer.length),
            "X-Aurelius-Share-View-Only": resolved.viewOnly ? "1" : "0",
          },
        });
      },
    },
  },
});
