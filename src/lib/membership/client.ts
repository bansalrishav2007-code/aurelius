import type { InviteCode, MembershipApplication, OnboardingChecklist } from "@/lib/auth/types";

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

export function fetchMembershipSettings() {
  return api<{ inviteOnlyMode: boolean }>("/api/membership/settings");
}

export function submitMembershipApplication(body: {
  fullName: string;
  phone: string;
  email: string;
  tierApplying: InviteCode["tier"];
  netWorthRange: "1-5cr" | "5-25cr" | "25cr+";
  primaryNeed: "tax" | "wealth" | "legal" | "all";
  hearAbout?: string;
  whyAccess: string;
  waitlistOnly?: boolean;
}) {
  return api<{ ok: true; id: string }>("/api/membership/apply", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchOnboardingChecklist() {
  return api<OnboardingChecklist & { complete: boolean; unlocked: boolean }>("/api/member/onboarding-checklist");
}

export function markIntroCallBooked() {
  return api<{ ok: true }>("/api/member/onboarding-checklist", {
    method: "PATCH",
    body: JSON.stringify({ introCallBooked: true }),
  });
}

export function unlockDashboard() {
  return api<{ ok: true }>("/api/member/onboarding-checklist", {
    method: "POST",
    body: JSON.stringify({ action: "unlock" }),
  });
}

export function submitUpgradeRequest(body: {
  requestedTier: InviteCode["tier"];
  reason?: string;
}) {
  return api<{ ok: true; id: string }>("/api/member/upgrade-request", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchAdminApplications() {
  return api<{ applications: MembershipApplication[] }>("/api/admin/membership/applications");
}

export function approveMembershipApplication(
  id: string,
  body?: { tier?: InviteCode["tier"]; expiresInDays?: number | null },
) {
  return api<{
    ok: true;
    invite: { code: string; tier: InviteCode["tier"] };
    emailSent: boolean;
  }>(`/api/admin/membership/applications/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export function rejectMembershipApplication(id: string, reason?: string) {
  return api<{ ok: true }>(`/api/admin/membership/applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function updateAdminInviteOnlyMode(enabled: boolean) {
  return api<{ inviteOnlyMode: boolean }>("/api/admin/membership/settings", {
    method: "PUT",
    body: JSON.stringify({ inviteOnlyMode: enabled }),
  });
}

export function updateAdminMember(
  memberId: string,
  body: { tier?: InviteCode["tier"]; suspended?: boolean },
) {
  return api<{ ok: true }>(`/api/admin/membership/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
