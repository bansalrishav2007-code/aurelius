const MEMBER_COOKIE = "aurelius_member";
const ACCESS_COOKIE = "aurelius_access";
const REFRESH_COOKIE = "aurelius_refresh";
const ADMIN_COOKIE = "aurelius_admin";
const PENDING_INVITE_COOKIE = "aurelius_pending_invite";

const ACCESS_MAX_AGE = 60 * 60 * 24 * 7;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;
const REFRESH_MAX_AGE_SHORT = 60 * 60 * 24 * 7;

const isProd = process.env.NODE_ENV === "production";

function cookieBase(maxAgeSec: number): string {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${isProd ? "; Secure" : ""}`;
}

export function setMemberSessionCookie(sessionId: string): string {
  return `${MEMBER_COOKIE}=${sessionId}; ${cookieBase(60 * 60 * 24 * 30)}`;
}

export function setAccessTokenCookie(accessToken: string): string {
  return `${ACCESS_COOKIE}=${accessToken}; ${cookieBase(ACCESS_MAX_AGE)}`;
}

export function setRefreshTokenCookie(refreshToken: string, rememberDevice?: boolean): string {
  const maxAge = rememberDevice ? REFRESH_MAX_AGE : REFRESH_MAX_AGE_SHORT;
  return `${REFRESH_COOKIE}=${refreshToken}; ${cookieBase(maxAge)}`;
}

export function clearAccessTokenCookie(): string {
  return `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function clearRefreshTokenCookie(): string {
  return `${REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getAccessToken(cookieHeader: string | null): string | undefined {
  return parseCookies(cookieHeader)[ACCESS_COOKIE];
}

export function getRefreshToken(cookieHeader: string | null): string | undefined {
  return parseCookies(cookieHeader)[REFRESH_COOKIE];
}

export function setAuthCookies(opts: {
  memberId: string;
  accessToken: string;
  refreshToken: string;
  rememberDevice?: boolean;
}): string[] {
  return [
    setMemberSessionCookie(opts.memberId),
    setAccessTokenCookie(opts.accessToken),
    setRefreshTokenCookie(opts.refreshToken, opts.rememberDevice),
  ];
}

export function clearAuthCookies(): string[] {
  return [clearMemberSessionCookie(), clearAccessTokenCookie(), clearRefreshTokenCookie()];
}

export function setAdminSessionCookie(sessionId: string): string {
  return `${ADMIN_COOKIE}=${sessionId}; ${cookieBase(60 * 60 * 8)}`;
}

export function setPendingInviteCookie(code: string): string {
  return `${PENDING_INVITE_COOKIE}=${encodeURIComponent(code)}; ${cookieBase(60 * 60 * 2)}`;
}

export function clearMemberSessionCookie(): string {
  return `${MEMBER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function clearAdminSessionCookie(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function clearPendingInviteCookie(): string {
  return `${PENDING_INVITE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((part) => {
      const [k, ...rest] = part.trim().split("=");
      return [k, decodeURIComponent(rest.join("="))];
    }),
  );
}

export function getMemberSessionId(cookieHeader: string | null): string | undefined {
  return parseCookies(cookieHeader)[MEMBER_COOKIE];
}

export function getAdminSessionId(cookieHeader: string | null): string | undefined {
  return parseCookies(cookieHeader)[ADMIN_COOKIE];
}

export function getPendingInviteCode(cookieHeader: string | null): string | undefined {
  const raw = parseCookies(cookieHeader)[PENDING_INVITE_COOKIE];
  return raw ? decodeURIComponent(raw) : undefined;
}

export function appendCookies(response: Response, cookies: string[]): Response {
  const headers = new Headers(response.headers);
  for (const c of cookies) {
    headers.append("Set-Cookie", c);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
