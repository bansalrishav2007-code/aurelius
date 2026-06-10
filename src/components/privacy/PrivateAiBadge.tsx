import { Lock } from "lucide-react";

const TOOLTIP = "This conversation is private and encrypted. Only you can see this.";

type Props = {
  className?: string;
  compact?: boolean;
};

export function PrivateAiBadge({ className = "", compact }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] text-muted-foreground ${className}`}
      title={TOOLTIP}
      aria-label={TOOLTIP}
    >
      <Lock className="h-3 w-3 text-success/80" strokeWidth={2} />
      {!compact && <span>Private & encrypted</span>}
    </span>
  );
}
