import type { InviteCode, PublicMember, WaitlistApplication } from "@/lib/auth/types";
import type { PaymentRecord } from "@/lib/payments/types";
import type { SupportTicket } from "@/lib/support/types";

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

export type FounderOverview = {
  stats: {
    totalUsers: number;
    totalMembers: number;
    totalRevenuePaise: number;
    totalRevenueCr: string;
    activeSubscriptions: number;
    pendingApplications: number;
    openTickets: number;
    activeInvites: number;
    totalEvents: number;
  };
  invites: InviteCode[];
  waitlist: WaitlistApplication[];
  members: PublicMember[];
  payments: PaymentRecord[];
  paymentSummary: {
    totalRevenuePaise: number;
    totalRevenueCr: string;
    capturedCount: number;
    pendingCount: number;
    failedCount: number;
    activeSubscriptions: number;
  };
  support: SupportTicket[];
  usage: {
    totalEvents: number;
    byMember: Record<string, { chat: number; upload: number; analyze: number }>;
    recent: { memberEmail: string; type: string; createdAt: string }[];
  };
};

export function fetchFounderOverview() {
  return api<FounderOverview>("/api/founder/overview");
}

export function updateFounderMember(
  memberId: string,
  body: {
    tier?: PublicMember["tier"];
    role?: PublicMember["role"];
    subscription?: PublicMember["subscription"];
    subscriptionPlan?: string;
    revoked?: boolean;
  },
) {
  return api<{ ok: true }>(`/api/founder/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteFounderMember(memberId: string) {
  return api<{ ok: true }>(`/api/founder/members/${memberId}`, { method: "DELETE" });
}

export function createFounderAdmin(body: {
  email: string;
  fullName: string;
  password: string;
  role?: "ADMIN" | "member";
}) {
  return api<{ member: PublicMember }>("/api/founder/admins", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateWaitlistNotes(waitlistId: string, adminNotes: string) {
  return api<{ ok: true }>(`/api/founder/waitlist/${waitlistId}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ adminNotes }),
  });
}

export function replySupportTicket(ticketId: string, message: string) {
  return api<{ ticket: SupportTicket }>(`/api/founder/support/${ticketId}/reply`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function setSupportTicketStatus(ticketId: string, status: "open" | "resolved") {
  return api<{ ticket: SupportTicket }>(`/api/founder/support/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function submitContactForm(body: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  return api<{ ok: true; id: string }>("/api/support", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
