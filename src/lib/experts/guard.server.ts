import { requireMemberSession } from "@/lib/auth/guard.server";
import { getExpertByPortalEmail } from "./store.server";

export async function requireExpertSession(request: Request) {
  const auth = await requireMemberSession(request);
  if (!auth.ok) return auth;
  if (auth.session.role !== "EXPERT") {
    return {
      ok: false as const,
      response: Response.json({ error: "Expert portal access required." }, { status: 403 }),
    };
  }
  const expert = await getExpertByPortalEmail(auth.session.email);
  if (!expert) {
    return {
      ok: false as const,
      response: Response.json({ error: "No expert profile linked to this account." }, { status: 403 }),
    };
  }
  return { ok: true as const, session: auth.session, expert };
}
