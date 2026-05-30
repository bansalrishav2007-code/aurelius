import { createFileRoute } from "@tanstack/react-router";
import { previewInviteCode } from "@/lib/auth/service.server";
import { appendCookies, setPendingInviteCookie } from "@/lib/auth/cookies.server";
import { normalizeInviteInput } from "@/lib/auth/store.server";

export const Route = createFileRoute("/api/auth/reserve-invite")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { code?: string; email?: string };
        if (!body.code?.trim()) {
          return Response.json({ error: "Invitation code is required." }, { status: 400 });
        }
        if (!body.email?.trim()) {
          return Response.json({ error: "Registered email is required." }, { status: 400 });
        }

        const preview = await previewInviteCode(body.code, body.email);
        if (!preview.valid) {
          return Response.json({ error: preview.error ?? "Invalid code." }, { status: 400 });
        }

        const normalized = normalizeInviteInput(body.code);
        return appendCookies(
          Response.json({ ok: true, tier: preview.tier, label: preview.label }),
          [setPendingInviteCookie(normalized)],
        );
      },
    },
  },
});
