import { createFileRoute } from "@tanstack/react-router";
import { previewInviteCode } from "@/lib/auth/service.server";
import { readStore } from "@/lib/auth/store.server";

function memberNumberFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String((hash % 99_999) + 1).padStart(5, "0");
}

export const Route = createFileRoute("/api/auth/verify-invite")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { code?: string; email?: string };
        if (!body.code?.trim()) {
          return Response.json({ valid: false, error: "Invitation code is required." }, { status: 400 });
        }

        const preview = await previewInviteCode(body.code, body.email);
        if (!preview.valid) {
          return Response.json(preview);
        }

        const email = body.email?.trim().toLowerCase();
        const store = await readStore();
        const existing = email ? store.members.find((m) => m.email === email) : undefined;

        return Response.json({
          ...preview,
          prefill: existing
            ? {
                fullName: existing.fullName,
                email: existing.email,
                tier: existing.tier,
                memberNumber: memberNumberFromId(existing.id),
                accountExists: true,
                needsPassword: !existing.passwordHash,
              }
            : email
              ? {
                  email,
                  tier: preview.tier,
                  accountExists: false,
                  needsPassword: true,
                }
              : undefined,
        });
      },
    },
  },
});
