import type { InviteCode, PublicInvitePreview, PublicMember, PublicSession, WaitlistApplication } from "./types";
import { otpErrorMessage, type OtpErrorCode } from "./otp.errors";

export class ApiError extends Error {
  code?: string;
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, code?: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  console.info("[Aurelius] API request", { path, method: init?.method ?? "GET" });
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    code?: string;
    retryAfterSeconds?: number;
  };
  if (!res.ok) {
    const rawMessage = (data as { error?: string }).error;
    const code = (data as { code?: string }).code;
    const retryAfterSeconds = (data as { retryAfterSeconds?: number }).retryAfterSeconds;
    const message =
      rawMessage ?? (code ? otpErrorMessage(code as OtpErrorCode) : `Request failed (${res.status})`);
    console.warn("[Aurelius] API error", { path, status: res.status, code, message, retryAfterSeconds });
    throw new ApiError(message, res.status, code, retryAfterSeconds);
  }
  console.info("[Aurelius] API success", { path, status: res.status });
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

export function startDemoSession(body: { firstName: string; email: string; purpose: string }) {
  return api<{ ok: true; session: PublicSession }>("/api/auth/demo", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function enterDevBypassSession(
  body: { fullName: string; email: string; secret?: string } | { quick: true },
) {
  return api<{ ok: true; session: PublicSession }>("/api/auth/dev-bypass", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function sendClientOtp(email: string, firstName: string) {
  return api<{
    ok: true;
    expiresAt: string;
    sent: boolean;
    resendId?: string;
  }>("/api/send-otp", {
    method: "POST",
    body: JSON.stringify({ email, fullName: firstName, source: "api" }),
  });
}

export function verifyClientOtp(email: string, otp: string, firstName: string) {
  return api<{ ok: true; message: string; session: PublicSession }>("/api/auth/verify-client-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp, firstName }),
  });
}

export function signInMember(
  email: string,
  password?: string,
  opts?: { otp?: string; rememberDevice?: boolean; totpCode?: string },
) {
  return api<
    | { ok: true; session: PublicSession }
    | { ok: false; requiresOtp: true; message?: string; maskedMobile?: string }
    | { ok: false; requires2fa: true; method?: string; maskedMobile?: string }
  >("/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      otp: opts?.otp,
      rememberDevice: opts?.rememberDevice,
      totpCode: opts?.totpCode,
    }),
  });
}

export function refreshAuthSession() {
  return api<{ ok: true; session: PublicSession }>("/api/auth/refresh", { method: "POST" });
}
export function signOutMember() {
  return api<{ ok: true }>("/api/auth/sign-out", { method: "POST" });
}

export function sendWaitlistOtp(email: string, fullName: string) {
  return api<{
    ok: true;
    expiresAt: string;
    sent: boolean;
    emailConfigured?: boolean;
    resendId?: string;
  }>("/api/otp/send", {
    method: "POST",
    body: JSON.stringify({ email, name: fullName, source: "waitlist" }),
  });
}

export function resendWaitlistOtp(email: string, fullName: string) {
  return api<{
    ok: true;
    expiresAt: string;
    sent: boolean;
    resendId?: string;
  }>("/api/otp/send", {
    method: "POST",
    body: JSON.stringify({ email, name: fullName, source: "waitlist" }),
  });
}

export function verifyWaitlistOtp(email: string, otp: string) {
  return api<{ ok: true; verificationToken: string; expiresAt: string }>("/api/otp/verify", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export function submitWaitlist(
  body: Omit<WaitlistApplication, "id" | "status" | "createdAt" | "emailVerifiedAt"> & {
    verificationToken: string;
  },
) {
  return api<{ ok: true; id: string; reference: string }>("/api/waitlist", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function registerWithInvite(body: { email: string; password: string; inviteCode: string; fullName?: string }) {
  return api<{ ok: true; session: PublicSession }>("/api/auth/register", {
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
    inviteOnlyMode?: boolean;
    membership?: {
      byTier: { principal: number; "family-office": number; founding: number };
      pendingApplications: number;
      recentActivity: import("./types").AdminActivityEntry[];
    };
  }>("/api/admin/dashboard");
}

export function createAdminInvite(body: {
  label?: string;
  tier: InviteCode["tier"];
  maxUses: number;
  expiresInDays: number | null;
  notes?: string;
  assignedEmail?: string;
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

export function declineWaitlist(id: string, reason?: string) {
  return api<{ ok: true }>(`/api/admin/waitlist/${id}/decline`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
