import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Circle, FolderLock, Landmark, Loader2, Phone, User } from "lucide-react";
import { getAuthSession } from "@/lib/auth/session.functions";
import { fetchOnboardingChecklist, markIntroCallBooked, unlockDashboard } from "@/lib/membership/client";
import type { OnboardingChecklist } from "@/lib/auth/types";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/getting-started")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (!session) throw redirect({ to: "/access" });
    if (session.dashboardUnlocked) throw redirect({ to: "/dashboard" });
    if (session.role === "EXPERT") throw redirect({ to: "/expert" });
    if (session.role === "SUPER_ADMIN") throw redirect({ to: "/founder" });
  },
  head: () => ({ meta: [{ title: "Getting Started — Aurelius" }] }),
  component: GettingStartedPage,
});

type ChecklistState = OnboardingChecklist & { complete: boolean; unlocked: boolean };

const items = [
  {
    key: "profileComplete" as const,
    label: "Complete profile",
    desc: "Set your display name and professional details",
    to: "/welcome",
    icon: User,
  },
  {
    key: "vaultSetup" as const,
    label: "Set up vault",
    desc: "Upload your first encrypted document",
    to: "/vault",
    icon: FolderLock,
  },
  {
    key: "firstAsset" as const,
    label: "Add first asset",
    desc: "Record an asset in Wealth Overview",
    to: "/dashboard/wealth-overview",
    icon: Landmark,
  },
  {
    key: "introCallBooked" as const,
    label: "Book intro call with expert",
    desc: "Optional — speak with your assigned advisor",
    to: "/dashboard/experts",
    icon: Phone,
    optional: true,
  },
];

function GettingStartedPage() {
  const { session } = AppRoute.useRouteContext();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<ChecklistState | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  function refresh() {
    return fetchOnboardingChecklist()
      .then(setChecklist)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleUnlock() {
    setUnlocking(true);
    try {
      await unlockDashboard();
      navigate({ to: "/dashboard" });
    } catch {
      await refresh();
    } finally {
      setUnlocking(false);
    }
  }

  async function skipIntroCall() {
    await markIntroCallBooked();
    await refresh();
  }

  const requiredDone =
    checklist?.profileComplete && checklist?.vaultSetup && checklist?.firstAsset;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-5 lg:p-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-2">Onboarding</p>
          <h1 className="font-display text-3xl tracking-tight">Welcome, {session.firstName ?? session.fullName.split(" ")[0]}.</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Complete these steps to unlock your private dashboard.
          </p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-3 border border-gold/10">
          {loading && !checklist ? (
            <div className="py-12 grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            items.map((item) => {
              const done = checklist?.[item.key] ?? false;
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                    done ? "border-success/30 bg-success/5" : "border-border/40 hover:border-gold/30"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${done ? "bg-success/15" : "bg-muted/30"}`}>
                    {done ? <Check className="h-4 w-4 text-success" /> : <Icon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {item.label}
                      {item.optional && <span className="text-muted-foreground font-normal"> (optional)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  {!done && item.optional && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        skipIntroCall();
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Skip
                    </button>
                  )}
                  {!done && !item.optional && <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                </Link>
              );
            })
          )}
        </div>

        <button
          onClick={handleUnlock}
          disabled={!requiredDone || unlocking}
          className="mt-6 w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-40"
        >
          {unlocking ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Unlock dashboard"}
        </button>

        {!requiredDone && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Complete profile, vault, and first asset to continue.
          </p>
        )}
      </div>
    </div>
  );
}
