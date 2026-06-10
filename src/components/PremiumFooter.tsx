import { Link } from "@tanstack/react-router";
import { ContactChannels } from "@/components/ContactChannels";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

const COPYRIGHT = "© 2026 Aurelius. All rights reserved.";
const FOUNDER_LINE = "Founder & Director — Rishav Aggarwal";

const legalLinks = [
  { label: "Privacy", to: "/privacy" as const },
  { label: "Terms", to: "/terms-and-conditions" as const },
  { label: "Security", to: "/security" as const },
  { label: "Contact", to: "/contact" as const },
] as const;

type PremiumFooterProps = {
  variant?: "full" | "compact" | "minimal";
  className?: string;
};

export function PremiumFooter({ variant = "full", className }: PremiumFooterProps) {
  return (
    <footer
      className={cn(
        "premium-footer",
        variant === "compact" && "premium-footer--compact",
        variant === "minimal" && "premium-footer--minimal",
        className,
      )}
      aria-label="Site footer"
    >
      <div className="premium-footer__divider" aria-hidden />

      <div className="premium-footer__inner">
        {variant === "full" && (
          <div className="premium-footer__top">
            <Logo size="sm" />
            <nav className="premium-footer__nav" aria-label="Legal">
              {legalLinks.map((item) => (
                <Link key={item.label} to={item.to} className="premium-footer__link">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        <div className="premium-footer__signature">
          <p className="premium-footer__founder">{FOUNDER_LINE}</p>
          {variant === "full" && (
            <p className="premium-footer__tagline">
              Private wealth intelligence · India
            </p>
          )}
        </div>

        <ContactChannels className="premium-footer__contact" />

        <div className="premium-footer__bottom">
          <p className="premium-footer__copyright">{COPYRIGHT}</p>
          {variant === "full" && (
            <Link to="/access" className="premium-footer__link premium-footer__link--accent">
              Private access
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
