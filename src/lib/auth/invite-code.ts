/** Total alphanumeric characters in a standard invite code (AURE + 4 + 4). */
export const INVITE_CODE_LENGTH = 12;
export const INVITE_CODE_PREFIX = "AURE";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function stripInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatInviteDisplay(raw: string): string {
  const clean = stripInviteCode(raw).slice(0, INVITE_CODE_LENGTH);
  if (clean.length <= 4) return clean;
  const prefix = clean.slice(0, 4);
  const mid = clean.slice(4, 8);
  const end = clean.slice(8, INVITE_CODE_LENGTH);
  return [prefix, mid, end].filter(Boolean).join("-");
}

export function generateInviteCode(): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  return `${INVITE_CODE_PREFIX}-${pick(4)}-${pick(4)}`;
}

export function generateUniqueInviteCode(existingCodes: Iterable<string>, maxAttempts = 32): string {
  const taken = new Set(existingCodes);
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateInviteCode();
    if (!taken.has(code)) return code;
  }
  throw new Error("Unable to generate a unique invite code.");
}

export function isDevInviteCode(raw: string): boolean {
  const clean = stripInviteCode(raw);
  return clean === "AURA" || clean === "AURE";
}

export function isCompleteInviteCode(raw: string): boolean {
  const clean = stripInviteCode(raw);
  if (isDevInviteCode(clean)) return true;
  return clean.length === INVITE_CODE_LENGTH && clean.startsWith(INVITE_CODE_PREFIX);
}
