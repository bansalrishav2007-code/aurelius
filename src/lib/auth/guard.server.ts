import { logAuditEvent } from "@/lib/audit/store.server";
import { resolveMemberFromCookies } from "./member-tokens.server";
import { resolveAdminSession, resolveMemberSession } from "./service.server";

export async function requireMemberSession(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const resolved = await resolveMemberFromCookies(cookieHeader);
  const session = await resolveMemberSession(cookieHeader);
  if (!session || !resolved) {
    return {
      ok: false as const,
      response: Response.json(
        {
          error: "Your session expired. Please log in again.",
          code: "SESSION_EXPIRED",
        },
        { status: 401 },
      ),
    };
  }
  if (session.email.toLowerCase() !== resolved.email.toLowerCase()) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    void logAuditEvent({
      memberId: resolved.memberId,
      memberEmail: resolved.email,
      action: "access_denied",
      resourceType: "session",
      detail: "Session email/token mismatch",
      ip,
      severity: "security",
    });
    return {
      ok: false as const,
      response: Response.json({ error: "Session invalid. Please sign in again.", code: "SESSION_INVALID" }, { status: 403 }),
    };
  }
  return { ok: true as const, session, memberId: resolved.memberId };
}

export async function requireAdminSession(request: Request) {
  const authed = await resolveAdminSession(request.headers.get("cookie"));
  if (!authed) {
    return { ok: false as const, response: Response.json({ error: "Admin session required." }, { status: 401 }) };
  }
  return { ok: true as const };
}
