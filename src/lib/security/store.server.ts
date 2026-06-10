import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { resolveDataFile } from "@/lib/data-path.server";
import { saveAdvisorResponseToVault } from "@/lib/chat/save-response.server";
import { sendAureliusEmail } from "@/lib/email/send.server";
import { listAuditEventsForMember } from "@/lib/audit/store.server";
import { listPrivacyAudit } from "@/lib/privacy/audit.server";
import { buildApiAccessLog } from "./api-access.server";
import { computeSecurityScore } from "./score";
import {
  deviceFingerprint,
  getClientIp,
  inferCity,
  parseUserAgent,
  sessionIdForDevice,
} from "./device.server";
import {
  buildOtpauthUrl,
  generateBackupCodes,
  generateTotpSecret,
  qrCodeImageUrl,
  verifyTotpCode,
} from "./totp.server";
import type {
  LoginHistoryEntry,
  LoginStatus,
  SecurityDashboard,
  SecurityNotificationPrefs,
  SecurityProfile,
  SecuritySession,
  SecurityStore,
  TrustedDevice,
} from "./types";
import { DEFAULT_SECURITY_NOTIFICATION_PREFS } from "./types";

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-security.json");
  return dataPathPromise;
}

let cache: SecurityStore | null = null;

function defaultStore(): SecurityStore {
  return { sessions: [], trustedDevices: [], loginHistory: [], profiles: [] };
}

async function readStore(): Promise<SecurityStore> {
  if (cache) return structuredClone(cache);
  const path = await getDataPath();
  await mkdir(dirname(path), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(path, "utf-8")) as SecurityStore;
    cache = {
      sessions: parsed.sessions ?? [],
      trustedDevices: parsed.trustedDevices ?? [],
      loginHistory: parsed.loginHistory ?? [],
      profiles: parsed.profiles ?? [],
    };
    return structuredClone(cache);
  } catch {
    const fresh = defaultStore();
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeStore(store: SecurityStore): Promise<void> {
  cache = structuredClone(store);
  const path = await getDataPath();
  await writeFile(path, JSON.stringify(store, null, 2), "utf-8");
}

function defaultProfile(email: string): SecurityProfile {
  return {
    memberEmail: email.toLowerCase(),
    twoFactorEnabled: false,
    updatedAt: new Date().toISOString(),
  };
}

function getOrCreateProfile(store: SecurityStore, email: string): SecurityProfile {
  const normalized = email.toLowerCase();
  let profile = store.profiles.find((p) => p.memberEmail === normalized);
  if (!profile) {
    profile = defaultProfile(email);
    store.profiles.push(profile);
  }
  return profile;
}

export function parseRequestDevice(request: Request, memberEmail: string) {
  const ua = request.headers.get("user-agent");
  const { deviceName, browser, browserVersion } = parseUserAgent(ua);
  const fingerprint = deviceFingerprint(ua);
  const location = inferCity(ua, memberEmail);
  const sessionId = sessionIdForDevice(memberEmail, fingerprint);
  const ipAddress = getClientIp(request);
  return { deviceName, browser, browserVersion, location, fingerprint, sessionId, userAgent: ua, ipAddress };
}

function syncTwoFactorFlags(profile: SecurityProfile) {
  if (
    profile.twoFactorEnabled &&
    !profile.smsTwoFactorEnabled &&
    !profile.authenticatorTwoFactorEnabled
  ) {
    if (profile.twoFactorMethod === "sms") profile.smsTwoFactorEnabled = true;
    else profile.authenticatorTwoFactorEnabled = true;
  }
  profile.twoFactorEnabled = Boolean(profile.smsTwoFactorEnabled || profile.authenticatorTwoFactorEnabled);
  if (profile.authenticatorTwoFactorEnabled && profile.smsTwoFactorEnabled) {
    profile.twoFactorMethod = profile.twoFactorMethod ?? "authenticator";
  } else if (profile.authenticatorTwoFactorEnabled) {
    profile.twoFactorMethod = "authenticator";
  } else if (profile.smsTwoFactorEnabled) {
    profile.twoFactorMethod = "sms";
  } else {
    profile.twoFactorMethod = undefined;
  }
}

function migrateLoginEntry(entry: LoginHistoryEntry): LoginHistoryEntry {
  if (!entry.status) {
    entry.status = entry.success ? "success" : "failed";
  }
  if (!entry.ipAddress) entry.ipAddress = "—";
  return entry;
}

function countConsecutiveFailed(history: LoginHistoryEntry[]): number {
  let count = 0;
  for (const h of history) {
    if (h.status === "failed") count++;
    else break;
  }
  return count;
}

function isNewLoginDevice(store: SecurityStore, email: string, deviceId: string): boolean {
  const normalized = email.toLowerCase();
  const priorSuccess = store.loginHistory.filter(
    (h) => h.memberEmail === normalized && (h.status === "success" || h.success),
  );
  if (priorSuccess.length === 0) return false;
  const trusted = store.trustedDevices.some((d) => d.id === deviceId && d.memberEmail === normalized);
  if (trusted) return false;
  const seenBefore = priorSuccess.some((h) => h.deviceId === deviceId);
  return !seenBefore;
}

export async function touchCurrentSession(request: Request, memberEmail: string): Promise<SecuritySession> {
  const store = await readStore();
  const normalized = memberEmail.toLowerCase();
  const device = parseRequestDevice(request, memberEmail);
  const now = new Date().toISOString();

  const { getAuthSessionIdFromRequest } = await import("@/lib/auth/member-tokens.server");
  const authSessionId =
    (await getAuthSessionIdFromRequest(request.headers.get("cookie"))) ?? undefined;

  let session = store.sessions.find((s) => s.id === device.sessionId && s.memberEmail === normalized);
  if (session) {
    session.lastActive = now;
    session.deviceName = device.deviceName;
    session.browser = device.browser;
    session.browserVersion = device.browserVersion;
    session.location = device.location;
    if (authSessionId) session.authSessionId = authSessionId;
  } else {
    session = {
      id: device.sessionId,
      memberEmail: normalized,
      deviceName: device.deviceName,
      browser: device.browser,
      browserVersion: device.browserVersion,
      location: device.location,
      createdAt: now,
      lastActive: now,
      authSessionId,
    };
    store.sessions.push(session);
  }

  for (const s of store.sessions) {
    s.current = s.id === device.sessionId && s.memberEmail === normalized;
  }

  getOrCreateProfile(store, memberEmail);
  await writeStore(store);
  return { ...session, current: true };
}

export async function linkAuthSessionOnLogin(
  request: Request,
  memberEmail: string,
  authSessionId: string,
): Promise<void> {
  const store = await readStore();
  const normalized = memberEmail.toLowerCase();
  const device = parseRequestDevice(request, memberEmail);
  const now = new Date().toISOString();

  let session = store.sessions.find((s) => s.id === device.sessionId && s.memberEmail === normalized);
  if (session) {
    session.authSessionId = authSessionId;
    session.lastActive = now;
    session.browserVersion = device.browserVersion;
    if (!session.createdAt) session.createdAt = now;
  } else {
    store.sessions.push({
      id: device.sessionId,
      memberEmail: normalized,
      deviceName: device.deviceName,
      browser: device.browser,
      browserVersion: device.browserVersion,
      location: device.location,
      createdAt: now,
      lastActive: now,
      authSessionId,
    });
  }
  await writeStore(store);
}

export async function getSecurityDashboard(
  request: Request,
  memberEmail: string,
  memberId: string,
): Promise<SecurityDashboard> {
  const current = await touchCurrentSession(request, memberEmail);
  const store = await readStore();
  const normalized = memberEmail.toLowerCase();
  const profile = store.profiles.find((p) => p.memberEmail === normalized) ?? defaultProfile(memberEmail);
  syncTwoFactorFlags(profile);

  const sessions = store.sessions
    .filter((s) => s.memberEmail === normalized)
    .map((s) => ({
      ...s,
      current: s.id === current.id,
      createdAt: s.createdAt ?? s.lastActive,
    }))
    .sort((a, b) => b.lastActive.localeCompare(a.lastActive));

  const trustedDevices = store.trustedDevices
    .filter((d) => d.memberEmail === normalized)
    .sort((a, b) => b.trustedAt.localeCompare(a.trustedAt));

  const loginHistory = store.loginHistory
    .filter((h) => h.memberEmail === normalized)
    .map(migrateLoginEntry)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentFailedAttempts = loginHistory.filter(
    (h) => h.status === "failed" && new Date(h.createdAt).getTime() > dayAgo,
  ).length;
  const consecutiveFailedAttempts = countConsecutiveFailed(loginHistory);

  const auditEvents = await listAuditEventsForMember(memberEmail, 50);
  const privacyEvents = await listPrivacyAudit(memberId);
  const apiAccessLog = buildApiAccessLog(auditEvents, privacyEvents);
  const securityScore = computeSecurityScore(profile, trustedDevices);
  const notificationPrefs = profile.notificationPrefs ?? DEFAULT_SECURITY_NOTIFICATION_PREFS;

  return {
    profile: structuredClone(profile),
    sessions,
    trustedDevices,
    loginHistory,
    recentFailedAttempts,
    consecutiveFailedAttempts,
    suspiciousLogin: profile.pendingSuspiciousLogin ?? null,
    securityScore,
    apiAccessLog,
    notificationPrefs,
    updatedAt: profile.updatedAt,
  };
}

export async function revokeSession(email: string, sessionId: string): Promise<boolean> {
  const store = await readStore();
  const normalized = email.toLowerCase();
  const target = store.sessions.find((s) => s.id === sessionId && s.memberEmail === normalized);
  if (!target) return false;

  if (target.authSessionId) {
    const { revokeAuthSessionById } = await import("@/lib/auth/member-tokens.server");
    await revokeAuthSessionById(target.authSessionId);
  }

  store.sessions = store.sessions.filter((s) => !(s.id === sessionId && s.memberEmail === normalized));
  await writeStore(store);
  return true;
}

export async function revokeAllOtherSessions(request: Request, email: string, memberId: string): Promise<number> {
  const store = await readStore();
  const normalized = email.toLowerCase();
  const currentId = parseRequestDevice(request, email).sessionId;
  const toRevoke = store.sessions.filter(
    (s) => s.memberEmail === normalized && s.id !== currentId,
  );

  const { revokeOtherAuthSessions, getAuthSessionIdFromRequest } = await import(
    "@/lib/auth/member-tokens.server"
  );
  const currentAuthId = await getAuthSessionIdFromRequest(request.headers.get("cookie"));
  if (currentAuthId) {
    await revokeOtherAuthSessions(memberId, currentAuthId);
  } else {
    for (const s of toRevoke) {
      if (s.authSessionId) {
        const { revokeAuthSessionById } = await import("@/lib/auth/member-tokens.server");
        await revokeAuthSessionById(s.authSessionId);
      }
    }
  }

  const before = store.sessions.length;
  store.sessions = store.sessions.filter((s) => s.memberEmail !== normalized || s.id === currentId);
  await writeStore(store);
  return before - store.sessions.length;
}

export async function startAuthenticatorSetup(email: string) {
  const store = await readStore();
  const profile = getOrCreateProfile(store, email);
  const secret = generateTotpSecret();
  profile.totpPendingSecret = secret;
  profile.updatedAt = new Date().toISOString();
  await writeStore(store);

  const otpauthUrl = buildOtpauthUrl(email, secret);
  return {
    secret,
    otpauthUrl,
    qrCodeUrl: qrCodeImageUrl(otpauthUrl),
  };
}

export async function confirmAuthenticatorSetup(email: string, code: string, fullName: string) {
  const store = await readStore();
  const profile = getOrCreateProfile(store, email);
  const secret = profile.totpPendingSecret;
  if (!secret) return { ok: false as const, error: "Start authenticator setup first." };
  if (!verifyTotpCode(secret, code)) return { ok: false as const, error: "Invalid verification code." };

  const backupCodes = generateBackupCodes(8);
  profile.totpSecret = secret;
  profile.totpPendingSecret = undefined;
  profile.authenticatorTwoFactorEnabled = true;
  profile.twoFactorEnabled = true;
  profile.twoFactorMethod = "authenticator";
  profile.backupCodes = backupCodes;
  syncTwoFactorFlags(profile);
  profile.updatedAt = new Date().toISOString();
  await writeStore(store);

  const codesText = backupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n");
  await saveAdvisorResponseToVault(
    email,
    "2FA Backup Codes",
    `Aurelius two-factor backup codes for ${fullName}.\n\nStore securely. Each code is single-use.\n\n${codesText}`,
  );

  return { ok: true as const, profile: structuredClone(profile), backupCodes };
}

export async function enableSmsTwoFactor(email: string, mobile?: string) {
  const store = await readStore();
  const profile = getOrCreateProfile(store, email);
  profile.smsTwoFactorEnabled = true;
  profile.registeredMobile = mobile?.trim() || profile.registeredMobile || "Registered mobile";
  profile.totpPendingSecret = undefined;
  syncTwoFactorFlags(profile);
  profile.updatedAt = new Date().toISOString();
  await writeStore(store);
  return structuredClone(profile);
}

export async function disableTwoFactor(email: string, method?: "sms" | "authenticator") {
  const store = await readStore();
  const profile = getOrCreateProfile(store, email);
  if (method === "sms") {
    profile.smsTwoFactorEnabled = false;
  } else if (method === "authenticator") {
    profile.authenticatorTwoFactorEnabled = false;
    profile.totpSecret = undefined;
    profile.backupCodes = undefined;
  } else {
    profile.smsTwoFactorEnabled = false;
    profile.authenticatorTwoFactorEnabled = false;
    profile.totpSecret = undefined;
    profile.totpPendingSecret = undefined;
    profile.backupCodes = undefined;
  }
  syncTwoFactorFlags(profile);
  profile.updatedAt = new Date().toISOString();
  await writeStore(store);
  return structuredClone(profile);
}

export async function verifyTwoFactorCode(email: string, code: string): Promise<boolean> {
  const store = await readStore();
  const profile = store.profiles.find((p) => p.memberEmail === email.toLowerCase());
  if (!profile?.twoFactorEnabled) return true;
  syncTwoFactorFlags(profile);

  if (profile.authenticatorTwoFactorEnabled && profile.totpSecret) {
    if (verifyTotpCode(profile.totpSecret, code)) return true;
    const backup = profile.backupCodes?.find(
      (c) => c.replace(/-/g, "") === code.replace(/-/g, "").toUpperCase(),
    );
    if (backup) {
      profile.backupCodes = profile.backupCodes?.filter((c) => c !== backup);
      profile.updatedAt = new Date().toISOString();
      await writeStore(store);
      return true;
    }
  }

  if (profile.smsTwoFactorEnabled && /^\d{6}$/.test(code.replace(/\s/g, ""))) {
    return true;
  }

  return false;
}

export async function isDeviceTrusted(request: Request, email: string): Promise<boolean> {
  const store = await readStore();
  const device = parseRequestDevice(request, email);
  const trusted = store.trustedDevices.find(
    (d) => d.id === device.sessionId && d.memberEmail === email.toLowerCase(),
  );
  if (!trusted?.skipOtpUntil) return false;
  return new Date(trusted.skipOtpUntil).getTime() > Date.now();
}

export async function trustCurrentDevice(request: Request, email: string, skipOtpDays = 30) {
  const store = await readStore();
  const normalized = email.toLowerCase();
  const device = parseRequestDevice(request, email);
  const skipUntil = new Date();
  skipUntil.setDate(skipUntil.getDate() + skipOtpDays);

  const existing = store.trustedDevices.find((d) => d.id === device.sessionId && d.memberEmail === normalized);
  if (existing) {
    existing.trustedAt = new Date().toISOString();
    existing.skipOtpUntil = skipUntil.toISOString();
    existing.deviceName = device.deviceName;
    existing.browser = device.browser;
    existing.location = device.location;
  } else {
    store.trustedDevices.push({
      id: device.sessionId,
      memberEmail: normalized,
      deviceName: device.deviceName,
      browser: device.browser,
      location: device.location,
      trustedAt: new Date().toISOString(),
      skipOtpUntil: skipUntil.toISOString(),
    });
  }

  await writeStore(store);
  return store.trustedDevices.find((d) => d.id === device.sessionId && d.memberEmail === normalized)!;
}

export async function removeTrustedDevice(email: string, deviceId: string): Promise<boolean> {
  const store = await readStore();
  const before = store.trustedDevices.length;
  store.trustedDevices = store.trustedDevices.filter(
    (d) => !(d.id === deviceId && d.memberEmail === email.toLowerCase()),
  );
  if (store.trustedDevices.length === before) return false;
  await writeStore(store);
  return true;
}

export async function requestAccountDeletion(email: string, fullName: string, origin: string) {
  const store = await readStore();
  const profile = getOrCreateProfile(store, email);
  const token = randomBytes(24).toString("hex");
  profile.deletionRequestedAt = new Date().toISOString();
  profile.deletionConfirmToken = token;
  profile.deletionConfirmSentAt = profile.deletionRequestedAt;
  profile.deletionConfirmedAt = undefined;
  profile.updatedAt = profile.deletionRequestedAt;
  await writeStore(store);

  const confirmUrl = `${origin}/dashboard/security?confirmDeletion=${token}`;
  await sendAureliusEmail({
    to: email,
    subject: "Confirm your Aurelius account deletion request",
    html: `
      <p>Dear ${fullName},</p>
      <p>We received a request to delete your Aurelius account. A 30-day cool-off period begins once you confirm.</p>
      <p><a href="${confirmUrl}">Confirm account deletion</a></p>
      <p>If you did not request this, ignore this email.</p>
    `,
    logLabel: "Deletion confirmation",
  });

  return { profile: structuredClone(profile), emailSent: true, devToken: token };
}

export async function confirmAccountDeletion(email: string, token: string) {
  const store = await readStore();
  const profile = store.profiles.find((p) => p.memberEmail === email.toLowerCase());
  if (!profile?.deletionConfirmToken || profile.deletionConfirmToken !== token) {
    return { ok: false as const, error: "Invalid or expired confirmation token." };
  }
  profile.deletionConfirmedAt = new Date().toISOString();
  profile.deletionConfirmToken = undefined;
  profile.updatedAt = profile.deletionConfirmedAt;
  await writeStore(store);
  return { ok: true as const, profile: structuredClone(profile) };
}

export async function recordLogin(
  request: Request,
  email: string,
  success: boolean,
  memberId?: string,
): Promise<void> {
  const store = await readStore();
  const normalized = email.toLowerCase();
  const device = parseRequestDevice(request, email);
  const profile = getOrCreateProfile(store, email);

  let status: LoginStatus = success ? "success" : "failed";
  if (success && isNewLoginDevice(store, email, device.sessionId)) {
    status = "suspicious";
    profile.pendingSuspiciousLogin = {
      id: `sus-${crypto.randomUUID()}`,
      deviceName: device.deviceName,
      browser: device.browser,
      location: device.location,
      ipAddress: device.ipAddress,
      createdAt: new Date().toISOString(),
    };

    if (memberId) {
      const { addNotification } = await import("@/lib/notifications/store.server");
      await addNotification({
        memberId,
        memberEmail: email,
        title: "New login detected",
        body: `Sign-in from ${device.location} · ${device.deviceName} · ${device.browser}`,
        category: "security",
      });
    }

    const prefs = profile.notificationPrefs ?? DEFAULT_SECURITY_NOTIFICATION_PREFS;
    if (prefs.loginNewDevice && prefs.channel !== "email") {
      await sendAureliusEmail({
        to: email,
        subject: "Aurelius security alert — new login",
        text: `New login from ${device.location} on ${device.deviceName} (${device.browser}). If this wasn't you, lock your account in Security Centre.`,
        logLabel: "New login SMS alert",
      }).catch(() => undefined);
    }
  }

  const entry: LoginHistoryEntry = {
    id: `log-${crypto.randomUUID()}`,
    memberEmail: normalized,
    deviceName: device.deviceName,
    browser: device.browser,
    location: device.location,
    status,
    success: status === "success" || status === "suspicious",
    ipAddress: device.ipAddress,
    deviceId: device.sessionId,
    createdAt: new Date().toISOString(),
  };
  store.loginHistory.unshift(entry);
  store.loginHistory = store.loginHistory.slice(0, 500);
  profile.updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function acknowledgeSuspiciousLogin(
  request: Request,
  email: string,
  secure: boolean,
  memberId: string,
) {
  const store = await readStore();
  const profile = getOrCreateProfile(store, email);
  profile.pendingSuspiciousLogin = null;
  profile.updatedAt = new Date().toISOString();
  await writeStore(store);

  if (secure) {
    const { getAuthSessionIdFromRequest, revokeOtherAuthSessions } = await import(
      "@/lib/auth/member-tokens.server"
    );
    const currentAuthId = await getAuthSessionIdFromRequest(request.headers.get("cookie"));
    if (currentAuthId) {
      await revokeOtherAuthSessions(memberId, currentAuthId);
    }
    await revokeAllOtherSessions(request, email, memberId);
  }
  return { secured: secure };
}

export async function markLoginHistoryReviewed(email: string) {
  const store = await readStore();
  const profile = getOrCreateProfile(store, email);
  profile.loginHistoryReviewedAt = new Date().toISOString();
  profile.updatedAt = profile.loginHistoryReviewedAt;
  await writeStore(store);
  return structuredClone(profile);
}

export async function updateSecurityNotificationPrefs(
  email: string,
  prefs: Partial<SecurityNotificationPrefs>,
) {
  const store = await readStore();
  const profile = getOrCreateProfile(store, email);
  profile.notificationPrefs = {
    ...(profile.notificationPrefs ?? DEFAULT_SECURITY_NOTIFICATION_PREFS),
    ...prefs,
  };
  profile.updatedAt = new Date().toISOString();
  await writeStore(store);
  return profile.notificationPrefs;
}

export async function changePasswordWithSessions(
  email: string,
  currentPassword: string,
  newPassword: string,
  fullName: string,
  memberId: string,
  keepCurrentSessionId?: string,
) {
  const { changeMemberPassword } = await import("@/lib/auth/service.server");
  const result = await changeMemberPassword(email, currentPassword, newPassword);
  if (!result.ok) return result;

  const { revokeOtherAuthSessions } = await import("@/lib/auth/member-tokens.server");
  if (keepCurrentSessionId) {
    await revokeOtherAuthSessions(memberId, keepCurrentSessionId);
  } else {
    const { revokeAllMemberSessions } = await import("@/lib/auth/member-tokens.server");
    await revokeAllMemberSessions(memberId);
  }

  const store = await readStore();
  const profile = getOrCreateProfile(store, email);
  profile.passwordChangedAt = new Date().toISOString();
  profile.updatedAt = profile.passwordChangedAt;
  await writeStore(store);

  await sendAureliusEmail({
    to: email,
    subject: "Your Aurelius password was changed",
    html: `<p>Dear ${fullName},</p><p>Your password was changed successfully. All other sessions have been signed out.</p><p>If you did not make this change, contact support immediately.</p>`,
    logLabel: "Password changed",
  }).catch(() => undefined);

  return { ok: true as const };
}

export async function emergencyLockAccount(email: string, fullName: string, memberId: string, origin: string) {
  const store = await readStore();
  const profile = getOrCreateProfile(store, email);
  const token = randomBytes(24).toString("hex");
  profile.emergencyLocked = true;
  profile.emergencyLockedAt = new Date().toISOString();
  profile.emergencyUnlockToken = token;
  profile.updatedAt = profile.emergencyLockedAt;
  await writeStore(store);

  const { revokeAllMemberSessions } = await import("@/lib/auth/member-tokens.server");
  await revokeAllMemberSessions(memberId);

  store.sessions = store.sessions.filter((s) => s.memberEmail !== email.toLowerCase());
  await writeStore(store);

  const unlockUrl = `${origin}/login?unlock=${token}`;
  await sendAureliusEmail({
    to: email,
    subject: "Aurelius account emergency locked",
    html: `<p>Dear ${fullName},</p><p>Your account has been emergency locked. No one can sign in until you verify via email.</p><p><a href="${unlockUrl}">Unlock my account</a></p>`,
    logLabel: "Emergency lock",
  });

  return { locked: true, devToken: token };
}

export async function unlockEmergencyAccount(email: string, token: string) {
  const store = await readStore();
  const profile = store.profiles.find((p) => p.memberEmail === email.toLowerCase());
  if (!profile?.emergencyLocked || profile.emergencyUnlockToken !== token) {
    return { ok: false as const, error: "Invalid unlock token." };
  }
  profile.emergencyLocked = false;
  profile.emergencyUnlockToken = undefined;
  profile.emergencyLockedAt = undefined;
  profile.updatedAt = new Date().toISOString();
  await writeStore(store);
  return { ok: true as const };
}

export async function isAccountEmergencyLocked(email: string): Promise<boolean> {
  const store = await readStore();
  const profile = store.profiles.find((p) => p.memberEmail === email.toLowerCase());
  return profile?.emergencyLocked === true;
}

export async function getTwoFactorStatus(email: string) {
  const store = await readStore();
  return store.profiles.find((p) => p.memberEmail === email.toLowerCase());
}
