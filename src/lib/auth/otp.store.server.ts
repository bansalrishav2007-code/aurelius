import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes, randomInt } from "node:crypto";
import { dirname } from "node:path";
import { resolveDataFile } from "@/lib/data-path.server";
import { hashPassword, verifyPassword } from "./password.server";

const OTP_EXPIRY_MS =
  (Number(process.env.OTP_EXPIRY_MINUTES) > 0 ? Number(process.env.OTP_EXPIRY_MINUTES) : 10) * 60 * 1000;
const TOKEN_EXPIRY_MS = 30 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_RESEND_COUNT = 3;
const RESEND_COOLDOWN_MS = 60 * 1000;
const RESEND_WINDOW_MS = 60 * 60 * 1000;

export const OTP_EXPIRY_MINUTES =
  Number(process.env.OTP_EXPIRY_MINUTES) > 0 ? Number(process.env.OTP_EXPIRY_MINUTES) : 10;

type OtpRecord = {
  email: string;
  codeHash: string;
  createdAt: string;
  expiresAt: string;
  verifyAttempts: number;
  resendCount: number;
  resendWindowStart: string;
  lastSentAt: string;
};

type VerificationToken = {
  email: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};

type OtpStore = {
  otps: Record<string, OtpRecord>;
  tokens: Record<string, VerificationToken>;
};

let dataPathPromise: Promise<string> | null = null;
let memoryStore: OtpStore | null = null;

async function getDataPath(): Promise<string> {
  dataPathPromise ??= resolveDataFile("aurelius-email-otp.json");
  return dataPathPromise;
}

function freshStore(): OtpStore {
  return { otps: {}, tokens: {} };
}

async function readOtpStore(): Promise<OtpStore> {
  if (memoryStore) return structuredClone(memoryStore);
  const DATA_PATH = await getDataPath();
  try {
    const parsed = JSON.parse(await readFile(DATA_PATH, "utf-8")) as OtpStore;
    memoryStore = {
      otps: parsed.otps ?? {},
      tokens: parsed.tokens ?? {},
    };
    return structuredClone(memoryStore);
  } catch {
    const fresh = freshStore();
    memoryStore = fresh;
    await writeOtpStore(fresh);
    return structuredClone(fresh);
  }
}

async function writeOtpStore(store: OtpStore): Promise<void> {
  memoryStore = structuredClone(store);
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

async function mutateOtpStore<T>(fn: (store: OtpStore) => T | Promise<T>): Promise<T> {
  const store = await readOtpStore();
  const result = await fn(store);
  await writeOtpStore(store);
  return result;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

function pruneExpired(store: OtpStore) {
  const now = Date.now();
  for (const [email, otp] of Object.entries(store.otps)) {
    if (new Date(otp.expiresAt).getTime() < now) delete store.otps[email];
  }
  for (const [token, entry] of Object.entries(store.tokens)) {
    if (new Date(entry.expiresAt).getTime() < now) delete store.tokens[token];
  }
}

export async function issueEmailOtp(email: string): Promise<
  | { ok: true; otp: string; expiresAt: string }
  | { ok: false; error: string; retryAfterSeconds?: number }
> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  return mutateOtpStore((store) => {
    pruneExpired(store);
    const now = Date.now();
    const existing = store.otps[normalized];

    if (existing) {
      const windowStart = new Date(existing.resendWindowStart).getTime();
      const inWindow = now - windowStart < RESEND_WINDOW_MS;
      const resendCount = inWindow ? existing.resendCount : 0;

      if (inWindow && resendCount >= MAX_RESEND_COUNT) {
        return {
          ok: false as const,
          error: "Too many OTP requests. Please wait 1 hour before trying again.",
        };
      }

      const sinceLast = now - new Date(existing.lastSentAt).getTime();
      if (sinceLast < RESEND_COOLDOWN_MS) {
        const secondsLeft = Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000);
        return {
          ok: false as const,
          error: `Please wait ${secondsLeft} seconds before requesting another code.`,
          retryAfterSeconds: secondsLeft,
        };
      }
    }

    const otp = generateOtpCode();
    const expiresAt = new Date(now + OTP_EXPIRY_MS).toISOString();
    const windowStart = existing && now - new Date(existing.resendWindowStart).getTime() < RESEND_WINDOW_MS
      ? existing.resendWindowStart
      : new Date(now).toISOString();
    const resendCount =
      existing && now - new Date(existing.resendWindowStart).getTime() < RESEND_WINDOW_MS
        ? existing.resendCount + 1
        : 1;

    store.otps[normalized] = {
      email: normalized,
      codeHash: hashPassword(otp),
      createdAt: new Date(now).toISOString(),
      expiresAt,
      verifyAttempts: 0,
      resendCount,
      resendWindowStart: windowStart,
      lastSentAt: new Date(now).toISOString(),
    };

    console.info("[Aurelius] OTP generated", {
      email: normalized,
      expiresAt,
      resendCount,
    });

    return { ok: true as const, otp, expiresAt };
  });
}

export async function verifyEmailOtp(
  email: string,
  code: string,
): Promise<
  | { ok: true; verificationToken: string; expiresAt: string }
  | { ok: false; error: string; code?: "OTP_NOT_FOUND" | "EXPIRED_OTP" | "TOO_MANY_ATTEMPTS" | "INVALID_OTP" }
> {
  const normalized = normalizeEmail(email);
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return { ok: false, error: "Enter the 6-digit verification code." };
  }

  return mutateOtpStore((store) => {
    pruneExpired(store);
    const record = store.otps[normalized];
    if (!record) {
      console.warn("[Aurelius] OTP verify failed — not found", { email: normalized });
      return { ok: false as const, error: "No verification code found. Request a new code.", code: "OTP_NOT_FOUND" as const };
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      delete store.otps[normalized];
      console.warn("[Aurelius] OTP verify failed — expired", { email: normalized });
      return { ok: false as const, error: "Verification code expired. Request a new code.", code: "EXPIRED_OTP" as const };
    }

    if (record.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
      delete store.otps[normalized];
      console.warn("[Aurelius] OTP verify failed — too many attempts", { email: normalized });
      return { ok: false as const, error: "Too many failed attempts. Request a new code.", code: "TOO_MANY_ATTEMPTS" as const };
    }

    if (!verifyPassword(trimmed, record.codeHash)) {
      record.verifyAttempts += 1;
      const remaining = MAX_VERIFY_ATTEMPTS - record.verifyAttempts;
      console.warn("[Aurelius] OTP verify failed — invalid code", { email: normalized, remaining });
      return {
        ok: false as const,
        error:
          remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
            : "Incorrect code.",
        code: "INVALID_OTP" as const,
      };
    }

    delete store.otps[normalized];
    console.info("[Aurelius] OTP verified successfully", { email: normalized });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString();
    store.tokens[token] = {
      email: normalized,
      token,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    return { ok: true as const, verificationToken: token, expiresAt };
  });
}

export async function revokeEmailOtp(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await mutateOtpStore((store) => {
    delete store.otps[normalized];
  });
}

export async function consumeVerificationToken(
  token: string,
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeEmail(email);

  return mutateOtpStore((store) => {
    pruneExpired(store);
    const entry = store.tokens[token];
    if (!entry) {
      return { ok: false as const, error: "Email verification expired. Please verify your email again." };
    }
    if (entry.email !== normalized) {
      return { ok: false as const, error: "Verification token does not match this email." };
    }
    if (new Date(entry.expiresAt).getTime() < Date.now()) {
      delete store.tokens[token];
      return { ok: false as const, error: "Email verification expired. Please verify your email again." };
    }
    delete store.tokens[token];
    return { ok: true as const };
  });
}
