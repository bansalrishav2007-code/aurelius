import { useState } from "react";
import { BarChart3, FolderLock, Landmark, Lock, Users } from "lucide-react";
import { DEMO_LOCK_MESSAGE } from "@/lib/demo/messages";

const icons = {
  landmark: Landmark,
  users: Users,
  folder: FolderLock,
  chart: BarChart3,
} as const;

type DemoLockedModuleCardProps = {
  title: string;
  description: string;
  icon: keyof typeof icons;
};

export function DemoLockedModuleCard({ title, description, icon }: DemoLockedModuleCardProps) {
  const [showTip, setShowTip] = useState(false);
  const Icon = icons[icon];

  return (
    <button
      type="button"
      onClick={() => setShowTip((v) => !v)}
      onBlur={() => setShowTip(false)}
      className="demo-module-card relative w-full text-left rounded-2xl overflow-hidden min-h-[10.5rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35"
    >
      <div className="demo-module-card__preview p-6 pointer-events-none select-none">
        <div className="h-10 w-10 rounded-xl bg-gold/8 border border-gold/15 grid place-items-center mb-4">
          <Icon className="h-4 w-4 text-gold/90" strokeWidth={1.4} />
        </div>
        <p className="text-sm font-medium tracking-tight">{title}</p>
        <p className="text-xs text-muted-foreground/90 mt-2 leading-relaxed">{description}</p>
      </div>

      <div className="demo-lock-veil absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-5">
        <div className="demo-lock-veil__icon">
          <Lock className="h-4 w-4 text-gold" strokeWidth={1.5} />
        </div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-center leading-snug">
          {DEMO_LOCK_MESSAGE}
        </p>
      </div>

      {showTip && (
        <div role="tooltip" className="demo-lock-tooltip absolute bottom-4 left-4 right-4 z-10">
          {DEMO_LOCK_MESSAGE}
        </div>
      )}
    </button>
  );
}
