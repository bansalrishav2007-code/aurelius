import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";
import { signJwt, verifyJwt } from "./jwt.server";
import { getAccessToken, getMemberSessionId, getRefreshToken } from "./cookies.server";

const ACCESS_TTL_SEC = 60 * 60 * 24 * 7;
const REFRESH_TTL_SEC = 60 * 60 * 24 * 30;
const REFRESH_TTL_SHORT_SEC = 60 * 60 * 24 * 7;

export type MemberAuthSession = {
  id: string;
  memberId: string;
  memberEmail: string;
  refreshTokenHash: string;
  rememberDevice: boolean;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  ip?: string;
  userAgent?: string;
};

type SessionStore = { sessions: MemberAuthSession[] };

let cache: SessionStore | null = null;
let pathPromise: Promise<string> | null = null;

async function dataPath() {
  pathPromise ??= resolveDataFile("aurelius-member-sessions.json");
  return pathPromise;
}

async function readStore(): Promise<SessionStore> {
  if (cache) return structuredClone(cache);
  const path = await dataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as SessionStore;
    cache = { sessions: parsed.sessions ?? [] };
    return structuredClone(cache);
  } catch {
    const fresh = { sessions: [] };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: SessionStore) {
  cache = structuredClone(store);
  const path = await dataPath();
  await writeFile(path, JSON.stringify(store, null, 2), "utf8");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAccessToken(memberId: string, email: string): string {
  return signJwt({ sub: memberId, email: email.toLowerCase(), type: "access" }, ACCESS_TTL_SEC);
}

export async function createAuthSession(opts: {
  memberId: string;
  memberEmail: string;
  rememberDevice?: boolean;
  ip?: string;
  userAgent?: string;
}): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const refreshToken = randomBytes(32).toString("hex");
  const sessionId = `sess-${randomBytes(12).toString("hex")}`;
  const ttl = opts.rememberDevice ? REFRESH_TTL_SEC : REFRESH_TTL_SHORT_SEC;
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const store = await readStore();
  store.sessions.push({
    id: sessionId,
    memberId: opts.memberId,
    memberEmail: opts.memberEmail.toLowerCase(),
    refreshTokenHash: hashToken(refreshToken),
    rememberDevice: opts.rememberDevice === true,
    createdAt: new Date().toISOString(),
    expiresAt,
    revoked: false,
    ip: opts.ip,
    userAgent: opts.userAgent,
  });
  await writeStore(store);

  return {
    accessToken: createAccessToken(opts.memberId, opts.memberEmail),
    refreshToken,
    sessionId,
  };
}

export async function revokeAllMemberSessions(memberId: string): Promise<void> {
  const store = await readStore();
  for (const s of store.sessions) {
    if (s.memberId === memberId) s.revoked = true;
  }
  await writeStore(store);
}

export async function revokeAuthSessionById(sessionId: string): Promise<boolean> {
  const store = await readStore();
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) return false;
  session.revoked = true;
  await writeStore(store);
  return true;
}

export async function revokeOtherAuthSessions(memberId: string, keepSessionId: string): Promise<number> {
  const store = await readStore();
  let count = 0;
  for (const s of store.sessions) {
    if (s.memberId === memberId && s.id !== keepSessionId && !s.revoked) {
      s.revoked = true;
      count++;
    }
  }
  await writeStore(store);
  return count;
}

export async function getAuthSessionIdFromRequest(cookieHeader: string | null): Promise<string | null> {
  const refresh = getRefreshToken(cookieHeader);
  if (!refresh) return null;
  const hash = hashToken(refresh);
  const store = await readStore();
  const session = store.sessions.find((s) => s.refreshTokenHash === hash && !s.revoked);
  return session?.id ?? null;
}

export async function revokeSessionByRefreshToken(refreshToken: string): Promise<void> {
  const hash = hashToken(refreshToken);
  const store = await readStore();
  const session = store.sessions.find((s) => s.refreshTokenHash === hash);
  if (session) session.revoked = true;
  await writeStore(store);
}

export async function refreshAuthSession(
  refreshToken: string,
): Promise<{ accessToken: string; memberId: string; email: string } | null> {
  const hash = hashToken(refreshToken);
  const store = await readStore();
  const session = store.sessions.find((s) => s.refreshTokenHash === hash && !s.revoked);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    session.revoked = true;
    await writeStore(store);
    return null;
  }
  session.expiresAt = new Date(
    Date.now() + (session.rememberDevice ? REFRESH_TTL_SEC : REFRESH_TTL_SHORT_SEC) * 1000,
  ).toISOString();
  await writeStore(store);
  return {
    accessToken: createAccessToken(session.memberId, session.memberEmail),
    memberId: session.memberId,
    email: session.memberEmail,
  };
}

export async function resolveMemberFromCookies(cookieHeader: string | null): Promise<{
  memberId: string;
  email: string;
} | null> {
  const access = getAccessToken(cookieHeader);
  if (access) {
    const payload = verifyJwt(access);
    if (payload?.type === "access") {
      return { memberId: payload.sub, email: payload.email };
    }
  }

  const legacyId = getMemberSessionId(cookieHeader);
  if (legacyId) {
    const { readStore: readAuth } = await import("./store.server");
    const store = await readAuth();
    const member = store.members.find((m) => m.id === legacyId);
    if (member && !member.revoked) {
      return { memberId: member.id, email: member.email };
    }
  }

  const refresh = getRefreshToken(cookieHeader);
  if (refresh) {
    const renewed = await refreshAuthSession(refresh);
    if (renewed) return { memberId: renewed.memberId, email: renewed.email };
  }

  return null;
}
