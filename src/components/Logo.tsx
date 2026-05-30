import { Link } from "@tanstack/react-router";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "lg" ? "h-9" : size === "sm" ? "h-6" : "h-7";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <svg viewBox="0 0 32 32" className={`${dim} w-auto`} fill="none" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.88 0.12 85)" />
            <stop offset="1" stopColor="oklch(0.55 0.15 255)" />
          </linearGradient>
        </defs>
        <path d="M16 2 L28 8 V20 C28 25 22 29 16 30 C10 29 4 25 4 20 V8 Z" stroke="url(#lg)" strokeWidth="1.4" fill="none" />
        <path d="M11 14 L16 19 L21 12" stroke="url(#lg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className={`font-display ${text} tracking-tight`}>Aureliuss</span>
        {size !== "sm" && (
          <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5">
            Private Wealth Intelligence
          </span>
        )}
      </div>
    </Link>
  );
}
