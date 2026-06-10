import { createHash } from "node:crypto";

const CITIES = ["Mumbai", "Bengaluru", "Delhi", "Hyderabad", "Chennai", "Pune"] as const;

export function parseUserAgent(userAgent: string | null): {
  deviceName: string;
  browser: string;
  browserVersion: string;
} {
  const ua = userAgent ?? "";
  let browser = "Browser";
  let browserVersion = "";

  const versionMatch = (pattern: RegExp) => {
    const m = ua.match(pattern);
    return m?.[1] ?? "";
  };

  if (ua.includes("Edg/")) {
    browser = "Edge";
    browserVersion = versionMatch(/Edg\/([\d.]+)/);
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome";
    browserVersion = versionMatch(/Chrome\/([\d.]+)/);
  } else if (ua.includes("Firefox/")) {
    browser = "Firefox";
    browserVersion = versionMatch(/Firefox\/([\d.]+)/);
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    browser = "Safari";
    browserVersion = versionMatch(/Version\/([\d.]+)/);
  }

  let deviceName = "Desktop";
  if (/iPhone|Android.*Mobile/i.test(ua)) deviceName = "iPhone";
  else if (/Android/i.test(ua)) deviceName = "Android";
  else if (/iPad|Tablet/i.test(ua)) deviceName = "Tablet";
  else if (/Windows/i.test(ua)) deviceName = "Windows PC";
  else if (/Macintosh/i.test(ua)) deviceName = "Mac";
  else if (/Linux/i.test(ua)) deviceName = "Linux";

  return { deviceName, browser, browserVersion };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "Unknown"
  );
}

export function deviceFingerprint(userAgent: string | null): string {
  const ua = userAgent ?? "unknown";
  return createHash("sha256").update(ua).digest("hex").slice(0, 16);
}

export function inferCity(userAgent: string | null, memberEmail: string): string {
  const seed = createHash("sha256").update(`${memberEmail}:${userAgent ?? ""}`).digest();
  return CITIES[seed[0] % CITIES.length];
}

export function sessionIdForDevice(memberEmail: string, fingerprint: string): string {
  return `sess-${createHash("sha256").update(`${memberEmail}:${fingerprint}`).digest("hex").slice(0, 12)}`;
}
