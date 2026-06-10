import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  FolderLock,
  Settings,
  Bell,
  Search,
  ShieldCheck,
  LogOut,
  Crown,
  ClipboardList,
  KeyRound,
  CreditCard,
  BarChart3,
  UserCog,
  FileText,
  Landmark,
  Target,
  BadgeCheck,
  LifeBuoy,
  Menu,
  X,
  Briefcase,
  UserCheck,
  Calendar,
  Calculator,
} from "lucide-react";
import { Logo } from "./Logo";
import { MemberIdentityCardModal } from "@/components/membership/MemberIdentityCardModal";
import { DemoModeBadge } from "@/components/demo/DemoModeBadge";
import { DemoLockedNavItem } from "@/components/demo/DemoLockedNavItem";
import { DEMO_LOCK_MESSAGE } from "@/lib/demo/messages";
import { signOutMember } from "@/lib/auth/client";
import type { PublicSession } from "@/lib/auth/types";
import { Route as AppRoute } from "@/routes/_app";

const memberNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/dashboard/ai-advisor", label: "AI Advisor", icon: MessageSquare },
  { to: "/dashboard/experts", label: "Experts", icon: Briefcase },
  { to: "/dashboard/bookings", label: "Bookings", icon: Calendar },
  { to: "/dashboard/vault", label: "Vault", icon: FolderLock },
  { to: "/dashboard/documents", label: "Documents", icon: FileText },
  { to: "/dashboard/wealth-overview", label: "Wealth Overview", icon: Landmark },
  { to: "/dashboard/tax-calculator", label: "Tax Calculator", icon: Calculator },
  { to: "/market-intelligence", label: "Market Intel", icon: BarChart3 },
  { to: "/dashboard/family-members", label: "Family Members", icon: UserCog },
  { to: "/dashboard/succession", label: "Succession", icon: Target },
  { to: "/dashboard/legal-entities", label: "Legal Entities", icon: Landmark },
  { to: "/dashboard/goals", label: "Goals & Planning", icon: Target },
  { to: "/dashboard/security", label: "Security", icon: ShieldCheck },
  { to: "/membership", label: "Membership", icon: BadgeCheck },
  { to: "/profile", label: "Profile & Settings", icon: Settings },
  { to: "/support", label: "Support Center", icon: LifeBuoy },
] as const;

const expertNav = [
  { to: "/expert", label: "Dashboard", icon: UserCheck },
  { to: "/expert/availability", label: "Availability", icon: Calendar },
  { to: "/profile", label: "Profile & Settings", icon: Settings },
] as const;

const founderNav = [
  { to: "/founder", label: "Founder Console", icon: Crown },
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/dashboard/ai-advisor", label: "AI Advisor", icon: MessageSquare },
  { to: "/dashboard/experts", label: "Experts", icon: Briefcase },
  { to: "/dashboard/bookings", label: "Bookings", icon: Calendar },
  { to: "/dashboard/vault", label: "Vault", icon: FolderLock },
  { to: "/dashboard/documents", label: "Documents", icon: FileText },
  { to: "/dashboard/wealth-overview", label: "Wealth Overview", icon: Landmark },
  { to: "/dashboard/tax-calculator", label: "Tax Calculator", icon: Calculator },
  { to: "/market-intelligence", label: "Market Intel", icon: BarChart3 },
  { to: "/dashboard/family-members", label: "Family Members", icon: UserCog },
  { to: "/dashboard/succession", label: "Succession", icon: Target },
  { to: "/dashboard/legal-entities", label: "Legal Entities", icon: Landmark },
  { to: "/dashboard/goals", label: "Goals & Planning", icon: Target },
  { to: "/dashboard/security", label: "Security", icon: ShieldCheck },
  { to: "/membership", label: "Membership", icon: BadgeCheck },
  { to: "/profile", label: "Profile & Settings", icon: Settings },
  { to: "/support", label: "Support Center", icon: LifeBuoy },
  { to: "/founder/clients", label: "Clients", icon: UserCog },
  { to: "/founder/experts", label: "Expert Marketplace", icon: Briefcase },
  { to: "/founder/expert-bookings", label: "Consultation Bookings", icon: Calendar },
  { to: "/founder/applications", label: "Membership Applications", icon: ClipboardList },
  { to: "/founder/payments", label: "Payments", icon: CreditCard },
  { to: "/founder/support", label: "Support", icon: MessageSquare },
  { to: "/founder/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/founder/invites", label: "Access Codes", icon: KeyRound },
  { to: "/founder/settings", label: "Settings", icon: Settings },
] as const;

type NavItem = (typeof memberNav)[number];

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

function isNavActive(path: string, to: string, demoWorkspace = false): boolean {
  if (demoWorkspace && to === "/dashboard") {
    return path === "/demo/workspace" || path === "/demo/workspace/";
  }
  if (to === "/founder") return path === "/founder" || path === "/founder/";
  if (to === "/dashboard") return path === "/dashboard" || path === "/dashboard/";
  return path.startsWith(to);
}

function scrollToDemoSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const DEMO_WORKSPACE_ALLOWED_NAV = new Set(["/dashboard", "/dashboard/ai-advisor", "/chat"]);

type AppShellProps = {
  session?: PublicSession;
  mode?: "default" | "demo-workspace";
  children?: ReactNode;
};

function AppShellLayout({ session, mode = "default", children }: Required<Pick<AppShellProps, "session">> & AppShellProps) {
  const demoWorkspace = mode === "demo-workspace";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [identityCardOpen, setIdentityCardOpen] = useState(false);
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  const isExpert = session.role === "EXPERT";
  const isDemo = session.isDemo === true || demoWorkspace;
  const displayName = session.firstName ?? session.fullName.split(/\s+/)[0] ?? "Principal";

  const navItems = isExpert ? expertNav : isSuperAdmin ? founderNav : memberNav;

  async function handleSignOut() {
    await signOutMember();
    router.navigate({ to: isDemo ? "/demo" : "/access" });
  }

  function renderNavItem(item: NavItem, onNavigate?: () => void) {
    const active = isNavActive(path, item.to, demoWorkspace);

    if (demoWorkspace) {
      if (item.to === "/dashboard") {
        return (
          <Link
            key={item.to}
            to="/demo/workspace"
            onClick={onNavigate}
            className={`sidebar-link ${active ? "sidebar-link--active" : ""}`}
          >
            <item.icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.5} />
            <span className="truncate">{item.label}</span>
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold shrink-0" />}
          </Link>
        );
      }
      if (item.to === "/chat") {
        return (
          <button
            key={item.to}
            type="button"
            onClick={() => {
              scrollToDemoSection("demo-ai-advisor");
              onNavigate?.();
            }}
            className="sidebar-link w-full"
          >
            <item.icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.5} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      }
      if (!DEMO_WORKSPACE_ALLOWED_NAV.has(item.to)) {
        return <DemoLockedNavItem key={item.to} label={item.label} icon={item.icon} />;
      }
    }

    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={`sidebar-link ${active ? "sidebar-link--active" : ""}`}
      >
        <item.icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.5} />
        <span className="truncate">{item.label}</span>
        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold shrink-0" />}
      </Link>
    );
  }

  function renderMobileNavItem(item: NavItem, onNavigate?: () => void) {
    const active = isNavActive(path, item.to, demoWorkspace);

    if (demoWorkspace) {
      if (item.to === "/dashboard") {
        return (
          <Link
            key={item.to}
            to="/demo/workspace"
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 ${
              active ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <item.icon className="h-4 w-4" strokeWidth={1.5} />
            {item.label}
          </Link>
        );
      }
      if (item.to === "/chat") {
        return (
          <button
            key={item.to}
            type="button"
            onClick={() => {
              scrollToDemoSection("demo-ai-advisor");
              onNavigate?.();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 w-full text-muted-foreground hover:bg-muted/50"
          >
            <item.icon className="h-4 w-4" strokeWidth={1.5} />
            {item.label}
          </button>
        );
      }
      return (
        <DemoLockedNavItem
          key={item.to}
          label={item.label}
          icon={item.icon}
          className="!px-3 !py-2.5 !rounded-lg !mb-0.5 !bg-transparent !border-0"
        />
      );
    }

    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 ${
          active ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <item.icon className="h-4 w-4" strokeWidth={1.5} />
        {item.label}
      </Link>
    );
  }

  function renderBottomNavItem(item: NavItem) {
    const active = isNavActive(path, item.to, demoWorkspace);

    if (demoWorkspace) {
      if (item.to === "/dashboard") {
        return (
          <Link
            key={item.to}
            to="/demo/workspace"
            className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-[3.5rem] ${
              active ? "text-gold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" strokeWidth={1.5} />
            <span className="truncate max-w-[4.5rem]">{item.label.split(" ")[0]}</span>
          </Link>
        );
      }
      if (item.to === "/chat") {
        return (
          <button
            key={item.to}
            type="button"
            onClick={() => scrollToDemoSection("demo-ai-advisor")}
            className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-[3.5rem] text-muted-foreground hover:text-foreground"
          >
            <item.icon className="h-4 w-4" strokeWidth={1.5} />
            <span className="truncate max-w-[4.5rem]">AI</span>
          </button>
        );
      }
      return (
        <button
          key={item.to}
          type="button"
          disabled
          className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium min-w-[3.5rem] text-muted-foreground/45 cursor-not-allowed"
          title={DEMO_LOCK_MESSAGE}
        >
          <item.icon className="h-4 w-4" strokeWidth={1.5} />
          <span className="truncate max-w-[4.5rem]">{item.label.split(" ")[0]}</span>
        </button>
      );
    }

    return (
      <Link
        key={item.to}
        to={item.to}
        className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-[3.5rem] ${
          active ? "text-gold" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <item.icon className="h-4 w-4" strokeWidth={1.5} />
        <span className="truncate max-w-[4.5rem]">{item.label.split(" ")[0]}</span>
      </Link>
    );
  }

  const bottomNavTargets = demoWorkspace
    ? (["/dashboard", "/dashboard/wealth-overview", "/dashboard/ai-advisor", "/dashboard/vault", "/dashboard/experts"] as const)
    : isExpert
      ? (["/expert", "/profile"] as const)
      : isSuperAdmin
        ? (["/founder", "/dashboard/wealth-overview", "/dashboard/ai-advisor", "/dashboard/vault", "/dashboard/experts"] as const)
        : (["/dashboard", "/dashboard/wealth-overview", "/dashboard/ai-advisor", "/dashboard/vault", "/dashboard/experts"] as const);

  return (
    <div className="min-h-screen luxury-gradient flex">
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border shrink-0">
        <div className="px-5 pt-6 pb-5 mb-1">
          <Logo size="md" />
        </div>

        <nav className="px-3 flex-1 space-y-0.5 overflow-y-auto scrollbar-none">
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        <div className="mx-3 mb-3 p-4 rounded-xl glass">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-success" strokeWidth={1.5} />
            <span className="text-xs font-medium">Vault Secured</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            End-to-end encrypted. AES-256. Your data never leaves India.
          </p>
          <p className="mt-3 text-[9px] text-muted-foreground/75 leading-relaxed" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            <a
              href="/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#c9a84c] hover:underline transition-colors"
            >
              Terms &amp; Conditions
            </a>
            <span className="mx-1">·</span>
            <a
              href="/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#c9a84c] hover:underline transition-colors"
            >
              Privacy Policy
            </a>
          </p>
        </div>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            type="button"
            onClick={() => setIdentityCardOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors text-left"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-gold-muted grid place-items-center text-xs font-medium shrink-0">
              {initials(session.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Welcome, {displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {demoWorkspace
                  ? "Private office · Preview"
                  : isDemo
                    ? "Demo · Principal preview"
                    : isExpert
                      ? "Expert · Advisory network"
                      : isSuperAdmin
                        ? "Super Admin · Founding circle"
                        : tierLabel[session.tier]}
              </p>
            </div>
            {demoWorkspace ? <DemoModeBadge compact /> : null}
          </button>
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

      <MemberIdentityCardModal open={identityCardOpen} onClose={() => setIdentityCardOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/60 pl-4 pr-5 lg:px-8 flex items-center gap-3 lg:gap-4 glass-strong sticky top-0 z-30">
          <div className="lg:hidden shrink-0">
            <Logo size="sm" showTagline={false} />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden h-9 w-9 grid place-items-center rounded-lg hover:bg-muted/50 transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  if (demoWorkspace) {
                    scrollToDemoSection("demo-ai-advisor");
                  } else {
                    router.navigate({ to: "/dashboard/ai-advisor" });
                  }
                  setSearchQuery("");
                }
              }}
              placeholder={demoWorkspace ? "Query intelligence desk…" : "Search — press Enter to open AI Advisor"}
              className="field-input h-9 !text-[13px] pl-9"
              aria-label="Search workspace"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isDemo && <DemoModeBadge compact className="hidden sm:inline-flex" />}
            <button
              type="button"
              className={`h-9 w-9 grid place-items-center rounded-lg transition-colors relative ${
                demoWorkspace ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"
              }`}
              aria-label="Notifications"
              disabled={demoWorkspace}
              title={demoWorkspace ? DEMO_LOCK_MESSAGE : undefined}
            >
              <Bell className="h-4 w-4" strokeWidth={1.5} />
              {!demoWorkspace && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
              )}
            </button>
            <div className="h-6 w-px bg-border hidden sm:block" />
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

        {mobileOpen && (
          <nav className="lg:hidden border-b border-border/60 glass-strong px-3 py-3 max-h-[70vh] overflow-y-auto">
            {navItems.map((item) => renderMobileNavItem(item, () => setMobileOpen(false)))}
          </nav>
        )}

        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
          {children ?? <Outlet />}
        </main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 glass-strong px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around">
          {bottomNavTargets
            .map((to) => navItems.find((i) => i.to === to))
            .filter((item): item is NavItem => Boolean(item))
            .map((item) => renderBottomNavItem(item))}
        </nav>
      </div>
    </div>
  );
}

function AppShellFromAppRoute({ children }: { children?: ReactNode }) {
  const { session } = AppRoute.useRouteContext();
  return (
    <AppShellLayout session={session} mode="default">
      {children}
    </AppShellLayout>
  );
}

export function AppShell({ session, mode = "default", children }: AppShellProps = {}) {
  if (mode === "demo-workspace") {
    if (!session) throw new Error("Demo workspace requires a session.");
    return (
      <AppShellLayout session={session} mode="demo-workspace">
        {children}
      </AppShellLayout>
    );
  }
  return <AppShellFromAppRoute>{children}</AppShellFromAppRoute>;
}
