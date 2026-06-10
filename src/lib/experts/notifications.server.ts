import { sendAureliusEmail } from "@/lib/email/send.server";
import type { ExpertBooking, ExpertProfile } from "./types";

export async function sendBookingConfirmationEmails(
  booking: ExpertBooking,
  expert: ExpertProfile,
): Promise<void> {
  const when = new Date(booking.scheduledAt).toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const agenda = booking.agenda || booking.notes || "General consultation";

  await sendAureliusEmail({
    to: booking.memberEmail,
    subject: `Consultation confirmed — ${expert.name}`,
    html: `
      <p>Your Aurelius consultation is booked.</p>
      <p><strong>Expert:</strong> ${expert.name}<br/>
      <strong>When:</strong> ${when}<br/>
      <strong>Agenda:</strong> ${agenda}</p>
      <p>You will receive a reminder 30 minutes before your call. Join from your Aurelius dashboard when the expert confirms.</p>
    `,
    logLabel: "booking-confirmation-member",
  });

  await sendAureliusEmail({
    to: expert.portalEmail,
    subject: `New consultation — ${booking.memberName}`,
    html: `
      <p>A new Aurelius consultation has been scheduled.</p>
      <p><strong>Client:</strong> ${booking.memberName}<br/>
      <strong>When:</strong> ${when}<br/>
      <strong>Agenda:</strong> ${agenda}</p>
      <p>Log in to your Expert Portal to confirm and view the client brief.</p>
    `,
    logLabel: "booking-confirmation-expert",
  });
}

export async function sendBookingReminderEmail(
  booking: ExpertBooking,
  expert: ExpertProfile,
  recipient: "member" | "expert",
): Promise<void> {
  const when = new Date(booking.scheduledAt).toLocaleString("en-IN", {
    timeStyle: "short",
  });
  const to = recipient === "member" ? booking.memberEmail : expert.portalEmail;

  await sendAureliusEmail({
    to,
    subject: `Reminder: consultation in 30 minutes`,
    html: `
      <p>Your Aurelius consultation with ${recipient === "member" ? expert.name : booking.memberName} starts at ${when}.</p>
      ${booking.meetingUrl ? `<p><a href="${booking.meetingUrl}">Join video call</a> from your Aurelius dashboard.</p>` : "<p>Open Aurelius to join when ready.</p>"}
    `,
    logLabel: "booking-reminder",
  });
}
