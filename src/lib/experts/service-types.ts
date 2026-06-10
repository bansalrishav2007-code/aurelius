export const BOOKING_SERVICE_TYPES = [
  { id: "tax_planning", label: "Tax Planning" },
  { id: "wealth_structuring", label: "Wealth Structuring" },
  { id: "legal_advisory", label: "Legal Advisory" },
  { id: "succession_planning", label: "Succession Planning" },
  { id: "general_consultation", label: "General Consultation" },
] as const;

export type BookingServiceType = (typeof BOOKING_SERVICE_TYPES)[number]["id"];

export const BOOKING_DURATIONS = [30, 60, 90] as const;
export type BookingDuration = (typeof BOOKING_DURATIONS)[number];

export const SERVICE_TYPE_LABELS: Record<BookingServiceType, string> = {
  tax_planning: "Tax Planning",
  wealth_structuring: "Wealth Structuring",
  legal_advisory: "Legal Advisory",
  succession_planning: "Succession Planning",
  general_consultation: "General Consultation",
};
