import { formatDistanceToNow } from "date-fns";

export function formatSessionDuration(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "Active for less than 1 hour";
  if (hours < 24) return `Active for ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `Active for ${days} day${days === 1 ? "" : "s"}`;
}

export function formatLoginStatus(status: "success" | "failed" | "suspicious") {
  if (status === "success") return { label: "✅ Success", className: "text-success" };
  if (status === "suspicious") return { label: "⚠️ Suspicious", className: "text-amber-400" };
  return { label: "❌ Failed", className: "text-destructive" };
}

export function relativeTime(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}
