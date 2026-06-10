export type ActivityEntry = {
  id: string;
  type: "page_visit" | "asset_added" | "ai_chat" | "document_upload";
  label: string;
  detail?: string;
  at: string;
};

const ACTIVITY_KEY = "aurelius-recent-activity";
const MODULE_USAGE_KEY = "aurelius-module-usage";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function logActivity(entry: Omit<ActivityEntry, "id" | "at">) {
  if (!isBrowser()) return;
  try {
    const list = loadActivity();
    list.unshift({
      ...entry,
      id: `act-${Date.now()}`,
      at: new Date().toISOString(),
    });
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

export function loadActivity(): ActivityEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export function trackModuleClick(path: string) {
  if (!isBrowser()) return;
  try {
    const usage = loadModuleUsage();
    usage[path] = (usage[path] ?? 0) + 1;
    localStorage.setItem(MODULE_USAGE_KEY, JSON.stringify(usage));
  } catch {
    /* ignore */
  }
}

export function loadModuleUsage(): Record<string, number> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(MODULE_USAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function sortModulesByUsage<T extends { to: string }>(modules: T[]): T[] {
  const usage = loadModuleUsage();
  return [...modules].sort((a, b) => (usage[b.to] ?? 0) - (usage[a.to] ?? 0));
}
