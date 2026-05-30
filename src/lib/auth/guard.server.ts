import { resolveAdminSession, resolveMemberSession } from "./service.server";

export async function requireMemberSession(request: Request) {
  const session = await resolveMemberSession(request.headers.get("cookie"));
  if (!session) {
    return { ok: false as const, response: Response.json({ error: "Private membership required." }, { status: 401 }) };
  }
  return { ok: true as const, session };
}

export async function requireAdminSession(request: Request) {
  const authed = await resolveAdminSession(request.headers.get("cookie"));
  if (!authed) {
    return { ok: false as const, response: Response.json({ error: "Admin session required." }, { status: 401 }) };
  }
  return { ok: true as const };
}
