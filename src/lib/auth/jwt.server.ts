import { createHmac, timingSafeEqual } from "node:crypto";

export type JwtPayload = {
  sub: string;
  email: string;
  type: "access" | "refresh";
};

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSecret(): string {
  return (
    process.env.AURELIUS_JWT_SECRET?.trim() ||
    process.env.AURELIUS_DATA_ENCRYPTION_KEY?.trim() ||
    "aurelius-dev-jwt-change-in-production"
  );
}

export function signJwt(payload: Omit<JwtPayload, "type"> & { type: JwtPayload["type"] }, expiresInSec: number): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + expiresInSec,
    }),
  );
  const sig = createHmac("sha256", getSecret()).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac("sha256", getSecret()).update(`${header}.${body}`).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as JwtPayload & { exp?: number };
    if (!parsed.sub || !parsed.email || !parsed.type) return null;
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: parsed.sub, email: parsed.email, type: parsed.type };
  } catch {
    return null;
  }
}
