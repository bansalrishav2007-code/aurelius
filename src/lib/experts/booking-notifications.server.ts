import { readStore as readAuthStore } from "@/lib/auth/store.server";
import { addNotification } from "@/lib/notifications/store.server";
import type { ExpertBooking, ExpertProfile } from "./types";
import { SERVICE_TYPE_LABELS } from "./service-types";

async function memberIdForEmail(email: string): Promise<string | null> {
  const auth = await readAuthStore();
  return auth.members.find((m) => m.email === email.toLowerCase())?.id ?? null;
}

async function notifyMember(
  email: string,
  title: string,
  body: string,
): Promise<void> {
  const memberId = await memberIdForEmail(email);
  if (!memberId) return;
  await addNotification({
    memberId,
    memberEmail: email,
    title,
    body,
    category: "expert",
  });
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}

export async function notifyBookingRequestSent(booking: ExpertBooking, expert: ExpertProfile): Promise<void> {
  const service = SERVICE_TYPE_LABELS[booking.serviceType] ?? "Consultation";
  await notifyMember(
    booking.memberEmail,
    "Booking request sent",
    `Your ${service} request with ${expert.name} is awaiting confirmation. Expected response within 2 hours.`,
  );
}

export async function notifyExpertNewRequest(booking: ExpertBooking, expert: ExpertProfile): Promise<void> {
  const service = SERVICE_TYPE_LABELS[booking.serviceType] ?? "Consultation";
  await notifyMember(
    expert.portalEmail,
    "New booking request",
    `${booking.memberName} requested a ${service} session on ${formatWhen(booking.scheduledAt)}.`,
  );
}

export async function notifyBookingConfirmed(booking: ExpertBooking, expert: ExpertProfile): Promise<void> {
  await notifyMember(
    booking.memberEmail,
    "Booking confirmed",
    `Your session with ${expert.name} is confirmed for ${formatWhen(booking.scheduledAt)}.`,
  );
}

export async function notifyBookingDeclined(booking: ExpertBooking, expert: ExpertProfile): Promise<void> {
  const reason = booking.declineReason ? ` Reason: ${booking.declineReason}` : "";
  await notifyMember(
    booking.memberEmail,
    "Booking declined",
    `${expert.name} declined your session request.${reason}`,
  );
}

export async function notifySuggestedTime(booking: ExpertBooking, expert: ExpertProfile): Promise<void> {
  const when = booking.suggestedTime ? formatWhen(booking.suggestedTime) : "a new time";
  await notifyMember(
    booking.memberEmail,
    "New time suggested",
    `${expert.name} suggested ${when}. Accept or decline from your bookings.`,
  );
}

export async function notifyBookingCancelled(
  booking: ExpertBooking,
  expert: ExpertProfile,
  cancelledBy: "member" | "expert" | "admin",
): Promise<void> {
  const when = formatWhen(booking.scheduledAt);
  if (cancelledBy === "member") {
    await notifyMember(expert.portalEmail, "Booking cancelled", `${booking.memberName} cancelled the session on ${when}.`);
  } else {
    await notifyMember(booking.memberEmail, "Booking cancelled", `Your session with ${expert.name} on ${when} was cancelled.`);
  }
}

export async function notifyMeetingReminder(
  booking: ExpertBooking,
  expert: ExpertProfile,
  minutesBefore: 30 | 10,
): Promise<void> {
  const label = minutesBefore === 30 ? "in 30 minutes" : "in 10 minutes";
  await notifyMember(booking.memberEmail, `Meeting ${label}`, `Your session with ${expert.name} starts ${label}.`);
  await notifyMember(expert.portalEmail, `Meeting ${label}`, `Your session with ${booking.memberName} starts ${label}.`);
}

export async function notifyMeetingEnded(booking: ExpertBooking, expert: ExpertProfile): Promise<void> {
  await notifyMember(
    booking.memberEmail,
    "Session complete — rate your expert",
    `Your session with ${expert.name} has ended. Share a rating from your bookings.`,
  );
}
