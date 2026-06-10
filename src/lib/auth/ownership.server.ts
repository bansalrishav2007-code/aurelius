import { logAuditEvent } from "@/lib/audit/store.server";

export function normalizeMemberEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertMemberOwnsResource(
  request: Request,
  loggedInEmail: string,
  resourceOwnerEmail: string,
  resourceType: string,
  resourceId?: string,
): Response | null {
  const owner = normalizeMemberEmail(resourceOwnerEmail);
  const session = normalizeMemberEmail(loggedInEmail);
  if (owner === session) return null;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  void logAuditEvent({
    memberEmail: session,
    action: "access_denied",
    resourceType,
    resourceId,
    detail: `Attempted access to ${resourceType} owned by another member`,
    ip,
    severity: "security",
  });

  return Response.json(
    { error: "You do not have permission to access this resource.", code: "FORBIDDEN" },
    { status: 403 },
  );
}

export function assertMemberIdMatch(
  request: Request,
  loggedInMemberId: string,
  resourceMemberId: string,
  resourceType: string,
): Response | null {
  if (loggedInMemberId === resourceMemberId) return null;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  void logAuditEvent({
    memberId: loggedInMemberId,
    action: "access_denied",
    resourceType,
    detail: `Member ID mismatch on ${resourceType}`,
    ip,
    severity: "security",
  });

  return Response.json(
    { error: "You do not have permission to access this resource.", code: "FORBIDDEN" },
    { status: 403 },
  );
}
