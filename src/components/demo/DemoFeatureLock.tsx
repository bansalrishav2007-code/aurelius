import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { DEMO_LOCK_CTA, DEMO_LOCK_MESSAGE } from "@/lib/demo/messages";

type DemoFeatureLockProps = {
  title: string;
  description?: string;
  className?: string;
};

export function DemoFeatureLock({
  title,
  description = DEMO_LOCK_MESSAGE,
  className = "",
}: DemoFeatureLockProps) {
  return (
    <div className={`demo-feature-lock rounded-2xl p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="demo-lock-veil__icon shrink-0">
          <Lock className="h-4 w-4 text-gold" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base tracking-tight">{title}</p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{description}</p>
          <Link to="/waitlist" className="demo-feature-lock__cta inline-flex mt-4 text-xs text-gold">
            {DEMO_LOCK_CTA}
          </Link>
        </div>
      </div>
    </div>
  );
}
