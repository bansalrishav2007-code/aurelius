import { createFileRoute } from "@tanstack/react-router";
import { appendCookies, setMemberSessionCookie } from "@/lib/auth/cookies.server";
import {
  devBypassRequiresSecret,
  enterDevBypass,
  isDevBypassEnabled,
  quickEnterDevBypass,
} from "@/lib/auth/dev-bypass.server";

export const Route = createFileRoute("/api/auth/dev-bypass")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          enabled: isDevBypassEnabled(),
          requiresSecret: devBypassRequiresSecret(),
        });
      },
      POST: async ({ request }) => {
        if (!isDevBypassEnabled()) {
          return Response.json(
            { ok: false, error: "Dev bypass is disabled.", code: "DEV_BYPASS_DISABLED" },
            { status: 403 },
          );
        }

        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          fullName?: string;
          secret?: string;
          quick?: boolean;
        };

        const result = body.quick
          ? await quickEnterDevBypass()
          : await enterDevBypass({
              email: body.email ?? "",
              fullName: body.fullName ?? "",
              secret: body.secret,
            });

        if (!result.ok) {
          return Response.json(
            { ok: false, error: result.error, code: result.code ?? "DEV_BYPASS_FAILED" },
            { status: result.code === "DEV_BYPASS_SECRET" ? 401 : 400 },
          );
        }

        return appendCookies(
          Response.json({
            ok: true,
            message: "Dev workspace ready",
            session: result.session,
          }),
          [setMemberSessionCookie(result.sessionId)],
        );
      },
    },
  },
});
