import { Instagram, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export const CONTACT_EMAIL = "aurelius.teamx@gmail.com";
export const CONTACT_GMAIL_COMPOSE = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}`;
export const INSTAGRAM_HANDLE = "@aureliuss.private";
export const INSTAGRAM_URL = "https://www.instagram.com/aureliuss.private/";

type ContactChannelsProps = {
  className?: string;
  stackOnMobile?: boolean;
};

export function ContactChannels({ className, stackOnMobile = true }: ContactChannelsProps) {
  return (
    <div
      className={cn(
        "contact-channels",
        stackOnMobile && "contact-channels--responsive",
        className,
      )}
    >
      <a
        href={CONTACT_GMAIL_COMPOSE}
        target="_blank"
        rel="noopener noreferrer"
        className="contact-channels__link contact-channels__link--email"
        aria-label={`Compose email to ${CONTACT_EMAIL} in Gmail`}
      >
        <Mail className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="contact-channels__email-text">
          <span className="contact-channels__label">Email:</span> {CONTACT_EMAIL}
        </span>
      </a>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="contact-channels__link"
      >
        <Instagram className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span>{INSTAGRAM_HANDLE}</span>
      </a>
    </div>
  );
}
