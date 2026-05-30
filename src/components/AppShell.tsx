import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, MessageSquare, FolderLock, Users, Settings, Bell, Search, ShieldCheck, LogOut, Shield } from "lucide-react";
import { Logo } from "./Logo";
import { signOutMember } from "@/lib/auth/client";
import { Route as AppRoute } from "@/routes/_app";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "AI Assistant", icon: MessageSquare },
  { to: "/vault", label: "Document Vault", icon: FolderLock },
  { to: "/advisors", label: "Advisors", icon: Users },
] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const tierLabel = {
  founding: "Founding circle",
  principal: "Principal · Tier I",
  "family-office": "Family office charter",
} as const;

export function AppShell() {
  const { session } = AppRoute.useRouteContext();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const isSuperAdmin = session.role === "SUPER_ADMIN";

  const navItems = [
    ...nav,
    ...(isSuperAdmin ? [{ to: "/admin" as const, label: "Admin", icon: Shield }] : []),
  ];

  async function handleSignOut() {
    await signOutMember();
    router.navigate({ to: "/access" });
  }

  return (
    <div className="min-h-screen luxury-gradient flex">
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border shrink-0">
        <div className="px-6 pt-7 pb-8">
          <Logo />
        </div>
        <nav className="px-3 flex-1 space-y-0.5">
          {navItems.map((item) => {
            const active = path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.5} />
                <span className="font-medium">{item.label}</span>
                {active && <span className="ml-auto h-1 w-1 rounded-full bg-gold" />}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 p-4 rounded-xl glass">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-success" strokeWidth={1.5} />
            <span className="text-xs font-medium">Vault Secured</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            End-to-end encrypted. AES-256. Your data never leaves India.
          </p>
        </div>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-gold-muted grid place-items-center text-xs font-medium">
              {initials(session.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{session.fullName}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {isSuperAdmin ? "Super Admin · Founding circle" : tierLabel[session.tier]}
              </p>
            </div>
            <Settings className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/60 px-5 lg:px-8 flex items-center gap-4 glass-strong sticky top-0 z-30">
          <div className="lg:hidden"><Logo size="sm" /></div>
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search documents, advisors, queries…"
              className="w-full bg-muted/40 border border-border rounded-lg pl-9 pr-3 h-9 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted/50 transition-colors relative">
              <Bell className="h-4 w-4" strokeWidth={1.5} />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-gold" />
            </button>
            <div className="h-6 w-px bg-border" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" strokeWidth={1.5} />
              Secure Session
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="lg:hidden h-9 w-9 grid place-items-center rounded-lg hover:bg-muted/50 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </header>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
