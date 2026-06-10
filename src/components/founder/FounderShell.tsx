import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  KeyRound,
  Users,
  CreditCard,
  MessageSquare,
  Settings,
  BarChart3,
  Briefcase,
  Calendar,
} from "lucide-react";

const founderNav = [
  { to: "/founder", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/founder/applications", label: "Membership Applications", icon: ClipboardList },
  { to: "/founder/invites", label: "Access Codes", icon: KeyRound },
  { to: "/founder/clients", label: "Clients", icon: Users },
  { to: "/founder/experts", label: "Experts", icon: Briefcase },
  { to: "/founder/expert-bookings", label: "Bookings", icon: Calendar },
  { to: "/founder/payments", label: "Payments", icon: CreditCard },
  { to: "/founder/support", label: "Support", icon: MessageSquare },
  { to: "/founder/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/founder/settings", label: "Settings", icon: Settings },
] as const;

export function FounderShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="page-container max-w-[1440px]">
      <header className="mb-8 pb-6 border-b border-border/40">
        <p className="text-caption text-gold/90 mb-2.5">Founder Console</p>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-2.5 max-w-2xl leading-relaxed">{subtitle}</p>}
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none -mx-1 px-1">
        {founderNav.map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                active
                  ? "btn-primary btn-sm btn-pill !h-9 pointer-events-none"
                  : "btn-secondary btn-sm btn-pill !h-9 !bg-transparent"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}

export function FounderStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-5 lift">
      <p className="label-caps mb-2">{label}</p>
      <p className="font-display text-3xl tracking-tight">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
