const STORAGE_KEY = "aurelius-vault-recent";
const MAX_RECENT = 4;

export function getRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(documentId: string): void {
  if (typeof window === "undefined") return;
  const current = getRecentlyViewedIds().filter((id) => id !== documentId);
  const next = [documentId, ...current].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getLastSecurityScan(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("aurelius-vault-security-scan");
}

export function recordSecurityScan(): string {
  const ts = new Date().toISOString();
  if (typeof window !== "undefined") {
    localStorage.setItem("aurelius-vault-security-scan", ts);
  }
  return ts;
}
