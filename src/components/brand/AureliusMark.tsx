import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Aurelius monogram — geometric A, institutional frame.
 * Inspired by private banking marks: minimal, confident, timeless.
 */
export function AureliusMark({
  className,
  size = 32,
  tone = "default",
}: {
  className?: string;
  size?: number;
  tone?: "default" | "gold";
}) {
  const uid = useId().replace(/:/g, "");
  const gold = `au-gold-${uid}`;
  const stroke = `au-stroke-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gold} x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B8A078" />
          <stop offset="50%" stopColor="#E8DCC8" />
          <stop offset="100%" stopColor="#9A8660" />
        </linearGradient>
        <linearGradient id={stroke} x1="20" y1="6" x2="20" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5F3EF" />
          <stop offset="100%" stopColor="#8A8A8A" />
        </linearGradient>
      </defs>

      {/* Outer frame — vault / institution */}
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="9"
        stroke={`url(#${gold})`}
        strokeWidth="0.75"
        opacity="0.55"
      />

      {/* A letterform — left stroke */}
      <path
        d="M12 30 L20 10"
        stroke={tone === "gold" ? `url(#${gold})` : `url(#${stroke})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* A letterform — right stroke */}
      <path
        d="M28 30 L20 10"
        stroke={tone === "gold" ? `url(#${gold})` : `url(#${stroke})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Crossbar */}
      <path
        d="M14.5 22.5 H25.5"
        stroke={`url(#${gold})`}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Apex point — intelligence node */}
      <circle cx="20" cy="10" r="1.8" fill={`url(#${gold})`} />
    </svg>
  );
}
