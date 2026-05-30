import type { InviteCode, PublicInvitePreview, PublicMember, PublicSession, WaitlistApplication } from "./types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data;
}

export function verifyInviteCode(code: string, email: string) {
  return api<PublicInvitePreview>("/api/auth/verify-invite", {
    method: "POST",
    body: JSON.stringify({ code, email }),
  });
}

export function reserveInviteCode(code: string, email: string) {
  return api<{ ok: true }>("/api/auth/reserve-invite", {
    method: "POST",
    body: JSON.stringify({ code, email }),
  });
}

export function completeOnboarding(body: {
  code: string;
  email: string;
  fullName: string;
  firm?: string;
  password?: string;
}) {
  return api<{ ok: true; session: PublicSession }>("/api/auth/onboard", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function signInMember(email: string, password?: string) {
  return api<{ ok: true; session: PublicSession }>("/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function signOutMember() {
  return api<{ ok: true }>("/api/auth/sign-out", { method: "POST" });
}

export function submitWaitlist(body: Omit<WaitlistApplication, "id" | "status" | "createdAt">) {
  return api<{ ok: true; id: string }>("/api/waitlist", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function adminLogin(key: string) {
  return api<{ ok: true }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
}

export function adminLogout() {
  return api<{ ok: true }>("/api/admin/logout", { method: "POST" });
}

export function fetchAdminDashboard() {
  return api<{
    invites: InviteCode[];
    waitlist: WaitlistApplication[];
    memberCount: number;
    members: PublicMember[];
    superAdminAccess?: boolean;
  }>("/api/admin/dashboard");
}

export function createAdminInvite(body: {
  label?: string;
  tier: InviteCode["tier"];
  maxUses: number;
  expiresInDays: number | null;
  notes?: string;
}) {
  return api<{ invite: InviteCode }>("/api/admin/invites", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function revokeAdminInvite(id: string) {
  return api<{ ok: true }>(`/api/admin/invites/${id}`, { method: "DELETE" });
}

export function approveWaitlist(id: string, body?: { tier?: InviteCode["tier"]; expiresInDays?: number | null }) {
  return api<{
    ok: true;
    invite: InviteCode;
    application: WaitlistApplication;
    emailSent: boolean;
    emailPreview?: { accessUrl: string; inviteCode: string };
    emailNote?: string;
  }>(`/api/admin/waitlist/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export function declineWaitlist(id: string) {
  return api<{ ok: true }>(`/api/admin/waitlist/${id}/decline`, { method: "POST" });
}
