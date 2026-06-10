import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import { DEMO_LOCK_MESSAGE } from "@/lib/demo/messages";

type DemoLockedTileProps = {
  label: string;
  value?: string | number;
  description?: string;
  icon?: LucideIcon;
  className?: string;
};

export function DemoLockedTile({ label, value, description, icon: Icon, className = "" }: DemoLockedTileProps) {
  const [showTip, setShowTip] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setShowTip((v) => !v)}
      onBlur={() => setShowTip(false)}
      className={`demo-lock-tile relative text-left rounded-xl border border-border/35 bg-muted/15 overflow-hidden cursor-not-allowed group ${className}`}
      aria-disabled
    >
      <div className="demo-lock-tile__preview p-4 pointer-events-none select-none">
        {Icon && <Icon className="h-4 w-4 text-gold/80 mb-3" strokeWidth={1.5} />}
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        {value !== undefined && <p className="font-display text-4xl mt-2 tabular-nums text-foreground/90">{value}</p>}
        {description && <p className="text-[10px] text-muted-foreground/80 mt-1 leading-snug">{description}</p>}
      </div>

      <div className="demo-lock-veil absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4">
        <div className="demo-lock-veil__icon">
          <Lock className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
        </div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-center leading-snug max-w-[12rem]">
          {DEMO_LOCK_MESSAGE}
        </p>
      </div>

      {showTip && (
        <span
          role="tooltip"
          className="demo-lock-tooltip absolute bottom-3 left-3 right-3 z-10"
        >
          {DEMO_LOCK_MESSAGE}
        </span>
      )}
    </button>
  );
}
