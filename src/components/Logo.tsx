import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { cn } from "@/lib/utils";

const BRAND = {
  name: "Aurelius",
  tagline: "Private Wealth Intelligence",
} as const;

const sizeConfig = {
  sm: { dim: "h-6", wordmark: "text-[15px]", tagline: "text-[7px]", gap: "gap-2.5", py: "" },
  md: { dim: "h-7", wordmark: "text-lg", tagline: "text-[8px]", gap: "gap-3", py: "" },
  lg: { dim: "h-9", wordmark: "text-2xl", tagline: "text-[9px]", gap: "gap-3.5", py: "py-0.5" },
} as const;

export function Logo({
  size = "md",
  variant = "full",
  className,
  showTagline = true,
}: {
  size?: keyof typeof sizeConfig;
  variant?: "full" | "icon";
  className?: string;
  showTagline?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const gradId = `logo-grad-${uid}`;
  const cfg = sizeConfig[size];
  const iconOnly = variant === "icon";

  return (
    <Link
      to="/"
      className={cn("flex items-center group shrink-0", iconOnly ? "gap-0" : cfg.gap, cfg.py, className)}
      aria-label={`${BRAND.name} — ${BRAND.tagline}`}
    >
      <svg
        viewBox="0 0 32 32"
        className={cn(cfg.dim, "w-auto transition-opacity duration-300 group-hover:opacity-90")}
        fill="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="oklch(0.88 0.12 85)" />
            <stop offset="55%" stopColor="oklch(0.78 0.11 82)" />
            <stop offset="100%" stopColor="oklch(0.55 0.15 255)" />
          </linearGradient>
        </defs>
        <path
          d="M16 2 L28 8 V20 C28 25 22 29 16 30 C10 29 4 25 4 20 V8 Z"
          stroke={`url(#${gradId})`}
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M11 14 L16 19 L21 12"
          stroke={`url(#${gradId})`}
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {!iconOnly && (
        <div className="flex flex-col leading-none min-w-0">
          <span className={cn("font-display tracking-[-0.03em] leading-none", cfg.wordmark)}>{BRAND.name}</span>
          {showTagline && (
            <span
              className={cn(
                "uppercase tracking-[0.2em] text-muted-foreground/85 mt-1 font-medium leading-none",
                cfg.tagline,
              )}
            >
              {BRAND.tagline}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
