import type { PublicSession } from "./types";

export function getPostAuthPath(session: PublicSession): string {
  if (session.role === "SUPER_ADMIN") return "/founder";
  if (session.role === "EXPERT") return "/expert";
  if (session.isDemo) return "/demo/workspace";
  if (session.onboardingComplete === false) return "/welcome";
  return "/dashboard";
}

/** Verifies the session cookie is active, then hard-navigates to the role-appropriate home. */
export async function redirectToDashboardAfterAuth(maxAttempts = 8): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { session?: PublicSession };
      if (data.session) {
        window.location.replace(getPostAuthPath(data.session));
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
  }
  throw new Error("Session could not be verified. Please try signing in again.");
}
