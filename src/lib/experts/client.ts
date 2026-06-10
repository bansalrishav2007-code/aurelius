import type { ExpertBooking, ExpertCategory, ExpertProfile } from "./types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data;
}

export type PublicExpert = ExpertProfile & {
  canBook: boolean;
  displayPrice?: string;
  discountPercent: number;
  specialisationTags?: string[];
  availableNow?: boolean;
  availableThisWeek?: boolean;
};

export type DashboardExpert = PublicExpert & {
  city?: string;
  verified?: boolean;
  displayTags?: string[];
  tagline?: string;
  credentials?: string[];
  notableClientTypes?: string[];
  availabilityStatus?: "accepting" | "waitlist";
  directorySpecialty?: string;
  introRequestCount?: number;
};

export type ExpertSlot = { date: string; slot: string; iso: string };
export type CalendarSlot = { slot: string; iso: string; status: "available" | "booked" | "unavailable" };
export type CalendarDay = { date: string; slots: CalendarSlot[] };

export function fetchExperts(category?: ExpertCategory) {
  const q = category ? `?category=${category}` : "";
  return api<{ experts: PublicExpert[] }>(`/api/member/experts${q}`);
}

export function fetchDashboardExperts(opts?: {
  q?: string;
  specialty?: string;
  city?: string;
  sort?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.specialty) params.set("specialty", opts.specialty);
  if (opts?.city) params.set("city", opts.city);
  if (opts?.sort) params.set("sort", opts.sort);
  const qs = params.toString() ? `?${params}` : "";
  return api<{ experts: DashboardExpert[] }>(`/api/member/experts${qs}`);
}

export function requestExpertIntroduction(
  expertId: string,
  body: { message: string; contactMethod: "email" | "call" | "video" },
) {
  return api<{ ok: true; message: string }>(`/api/member/experts/${expertId}/introduction`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchExpertDetail(expertId: string, durationMinutes = 60) {
  return api<{ expert: PublicExpert; slots: ExpertSlot[]; calendar: CalendarDay[] }>(
    `/api/member/experts/${expertId}?duration=${durationMinutes}`,
  );
}

export function createExpertBooking(body: {
  expertId: string;
  scheduledAt: string;
  durationMinutes?: 30 | 60 | 90;
  serviceType?: string;
  notes?: string;
  agenda?: string;
  vaultBriefApproved?: boolean;
}) {
  return api<{ booking: ExpertBooking }>("/api/member/expert-bookings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchMyBookings() {
  return api<{ bookings: (ExpertBooking & { expertName: string; expertPhotoUrl?: string })[] }>(
    "/api/member/expert-bookings",
  );
}

export function payForBooking(bookingId: string) {
  return api<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    bookingId: string;
  }>(`/api/member/expert-bookings/${bookingId}/pay`, { method: "POST" });
}

export function confirmBookingPayment(bookingId: string, orderId?: string) {
  return api<{ booking: ExpertBooking }>(`/api/member/expert-bookings/${bookingId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

export function fetchFounderExperts() {
  return api<{ experts: ExpertProfile[]; revenue: Awaited<ReturnType<typeof import("./store.server").getExpertRevenueSummary>> }>(
    "/api/founder/experts",
  );
}

export function createFounderExpert(body: Record<string, unknown>) {
  return api<{ expert: ExpertProfile }>("/api/founder/experts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateFounderExpert(expertId: string, body: Record<string, unknown>) {
  return api<{ expert: ExpertProfile }>(`/api/founder/experts/${expertId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteFounderExpert(expertId: string) {
  return api<{ ok: boolean }>(`/api/founder/experts/${expertId}`, { method: "DELETE" });
}

export function fetchFounderExpertBookings() {
  return api<{ bookings: ExpertBooking[] }>("/api/founder/expert-bookings");
}

export function fetchExpertAppointments() {
  return api<{ appointments: (ExpertBooking & { expertName: string })[]; expert: ExpertProfile }>(
    "/api/expert/appointments",
  );
}

export function updateExpertAppointment(
  bookingId: string,
  body: {
    status?: "confirmed" | "rejected" | "completed";
    action?: "suggest_time";
    expertNotes?: string;
    sessionNotes?: string;
    declineReason?: string;
    suggestedTime?: string;
  },
) {
  return api<{ booking: ExpertBooking }>(`/api/expert/appointments/${bookingId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updateMemberBooking(
  bookingId: string,
  body: { action: "cancel" | "accept_suggested" | "rate"; rating?: number; review?: string },
) {
  return api<{ booking: ExpertBooking }>(`/api/member/expert-bookings/${bookingId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function fetchBookingMeeting(bookingId: string) {
  return api<{
    booking: ExpertBooking & { expertName: string; expertPhotoUrl?: string };
    canJoin: boolean;
    joinOpensAt: string;
    meetingUrl?: string;
  }>(`/api/member/expert-bookings/${bookingId}`);
}

export function fetchExpertBookingBrief(bookingId: string) {
  return api<{
    brief: string;
    wealthSnapshot: { netWorth?: string; healthScore?: number };
    agenda?: string;
  }>(`/api/expert/appointments/${bookingId}/brief`);
}

export function verifyExpertMeetingJoin(bookingId: string, joinCode: string) {
  return api<{ meetingUrl?: string; canJoin: boolean; joinOpensAt: string }>(
    `/api/expert/meeting/${bookingId}`,
    { method: "POST", body: JSON.stringify({ joinCode }) },
  );
}

export function fetchAdminBookings(status?: string) {
  const q = status ? `?status=${status}` : "";
  return api<{
    bookings: (ExpertBooking & { expertName: string; memberLabel: string })[];
    stats: {
      monthTotal: number;
      pending: number;
      confirmed: number;
      completed: number;
      cancelled: number;
      revenuePaise: number;
    };
    expertStats: { id: string; name: string; totalBookings: number; acceptanceRate: number; rating: number }[];
  }>(`/api/admin/bookings${q}`);
}

export function adminBookingAction(
  bookingId: string,
  action: "confirm" | "reject" | "cancel" | "complete",
  opts?: { declineReason?: string; suggestedTime?: string },
) {
  return api<{ booking: ExpertBooking }>("/api/admin/bookings", {
    method: "PATCH",
    body: JSON.stringify({ bookingId, action, ...opts }),
  });
}

export function updateExpertPortalAvailability(availability: ExpertProfile["availability"]) {
  return api<{ expert: ExpertProfile }>("/api/expert/availability", {
    method: "PATCH",
    body: JSON.stringify({ availability }),
  });
}

export function submitExpertApplication(body: {
  fullName: string;
  email: string;
  qualification: string;
  councilNumber?: string;
  specialisation?: string;
  yearsExperience?: number;
  linkedIn?: string;
  credentialsNote?: string;
}) {
  return api<{ ok: true; applicationId: string }>("/api/experts/apply", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchExpertChat(expertId: string) {
  return api<{ thread: import("./types").ExpertChatThread; vaultShareApproved: boolean }>(
    `/api/member/expert-chat/${expertId}`,
  );
}

export function sendExpertChatMessage(threadId: string, content: string, documentIds?: string[]) {
  return api<{ message: import("./types").ExpertChatMessage; thread: import("./types").ExpertChatThread }>(
    `/api/member/expert-chat/${threadId}/messages`,
    { method: "POST", body: JSON.stringify({ content, documentIds }) },
  );
}

export function approveExpertVaultShare(body: { expertId: string; mainConcern?: string }) {
  return api<{ relation: import("./types").ExpertClientRelation }>("/api/member/expert-vault-share", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchExpertClients() {
  return api<{ clients: (import("./types").ExpertClientRelation & { brief?: string })[] }>("/api/expert/clients");
}

export function fetchExpertInbox() {
  return api<{ threads: import("./types").ExpertChatThread[] }>("/api/expert/chat");
}

export function fetchExpertThread(threadId: string) {
  return api<{ thread: import("./types").ExpertChatThread }>(`/api/expert/chat/${threadId}/messages`);
}

export function sendExpertPortalMessage(threadId: string, content: string) {
  return api<{ message: import("./types").ExpertChatMessage; thread: import("./types").ExpertChatThread }>(
    `/api/expert/chat/${threadId}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
}

export function signExpertNda() {
  return api<{ ok: true; signedAt: string }>("/api/expert/nda", { method: "POST" });
}
