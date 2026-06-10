import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT = "aurelius-user-vault-v1";

function deriveKey(): Buffer {
  const secret =
    process.env.AURELIUS_DATA_ENCRYPTION_KEY?.trim() ||
    process.env.DEV_BYPASS_SECRET?.trim() ||
    "aurelius-dev-encryption-set-AURELIUS_DATA_ENCRYPTION_KEY-in-production";
  return scryptSync(secret, SALT, 32);
}

/** AES-256-GCM encrypt JSON payload for at-rest storage. */
export function encryptJson(data: unknown): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Decrypt AES-256-GCM payload back to JSON. */
export function decryptJson<T>(payload: string): T {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const key = deriveKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as T;
}
