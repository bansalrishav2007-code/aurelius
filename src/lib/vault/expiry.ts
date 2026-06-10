import { differenceInCalendarDays, parseISO } from "date-fns";
import type { DocumentCategory } from "./types";

export const EXPIRY_CATEGORIES = new Set<DocumentCategory>([
  "Insurance Policy",
  "Insurance",
  "Property Document",
  "Property",
]);

export function categoryNeedsExpiry(category: DocumentCategory): boolean {
  return EXPIRY_CATEGORIES.has(category);
}

export type ExpiryBadge = {
  label: string;
  tone: "red" | "yellow";
};

export function expiryBadge(expiryDate?: string): ExpiryBadge | null {
  if (!expiryDate) return null;
  const days = differenceInCalendarDays(parseISO(expiryDate), new Date());
  if (days < 0) return { label: "EXPIRED", tone: "red" };
  if (days <= 30) {
    if (days <= 7) return { label: "EXPIRES SOON", tone: "red" };
    return { label: `EXPIRES IN ${days} DAYS`, tone: "yellow" };
  }
  return null;
}

export function documentsExpiringSoon(
  docs: { id: string; name: string; expiryDate?: string }[],
  withinDays = 30,
): { id: string; name: string; daysLeft: number }[] {
  const now = new Date();
  return docs
    .filter((d) => d.expiryDate)
    .map((d) => ({
      id: d.id,
      name: d.name,
      daysLeft: differenceInCalendarDays(parseISO(d.expiryDate!), now),
    }))
    .filter((d) => d.daysLeft >= 0 && d.daysLeft <= withinDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
