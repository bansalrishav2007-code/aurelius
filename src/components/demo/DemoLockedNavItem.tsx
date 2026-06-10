import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import { DEMO_LOCK_MESSAGE } from "@/lib/demo/messages";

type DemoLockedNavItemProps = {
  label: string;
  icon: LucideIcon;
  className?: string;
};

export function DemoLockedNavItem({ label, icon: Icon, className = "" }: DemoLockedNavItemProps) {
  const [showTip, setShowTip] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setShowTip((v) => !v)}
      onBlur={() => setShowTip(false)}
      className={`sidebar-link demo-nav-locked relative ${className}`}
      aria-disabled
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.5} />
      <span className="truncate opacity-80">{label}</span>
      <Lock className="h-3 w-3 ml-auto shrink-0 text-gold/60" strokeWidth={1.5} />
      {showTip && (
        <span role="tooltip" className="demo-nav-lock-tooltip">
          {DEMO_LOCK_MESSAGE}
        </span>
      )}
    </button>
  );
}
