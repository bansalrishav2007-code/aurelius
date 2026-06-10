import { Sparkles } from "lucide-react";

type DemoModeBadgeProps = {
  className?: string;
  compact?: boolean;
};

export function DemoModeBadge({ className = "", compact = false }: DemoModeBadgeProps) {
  return (
    <span
      className={`demo-preview-badge inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/8 text-gold ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"} tracking-[0.16em] uppercase font-medium ${className}`}
    >
      <Sparkles className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={1.6} />
      Private preview
    </span>
  );
}
