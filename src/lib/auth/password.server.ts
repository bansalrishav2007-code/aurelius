import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = scryptSync(password, salt, KEY_LEN);
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), attempt);
  } catch {
    return false;
  }
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}
