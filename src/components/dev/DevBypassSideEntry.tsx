import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { enterDevBypassSession } from "@/lib/auth/client";
import { redirectToDashboardAfterAuth } from "@/lib/auth/redirect-after-auth";

export function DevBypassSideEntry() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    fetch("/api/auth/dev-bypass", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false));

    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d: { session?: unknown }) => setHasSession(Boolean(d.session)))
      .catch(() => setHasSession(false));
  }, [pathname]);

  async function handleQuickEnter() {
    setLoading(true);
    setError(null);
    try {
      await enterDevBypassSession({ quick: true });
      await redirectToDashboardAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to enter test workspace.");
    } finally {
      setLoading(false);
    }
  }

  if (!enabled || hasSession) return null;
  if (pathname.startsWith("/dev/enter")) return null;

  return (
    <div className="dev-bypass-side-entry" aria-label="Dev test workspace entry">
      <button
        type="button"
        className="dev-bypass-side-entry__btn"
        onClick={() => void handleQuickEnter()}
        disabled={loading}
        title="One-click dev bypass into the member dashboard"
      >
        <FlaskConical className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="dev-bypass-side-entry__label">{loading ? "Entering…" : "Test workspace"}</span>
      </button>
      <Link to="/dev/enter" className="dev-bypass-side-entry__link">
        Custom entry
      </Link>
      {error && (
        <p className="dev-bypass-side-entry__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
