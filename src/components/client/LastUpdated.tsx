import { formatDistanceToNow } from "date-fns";

export function LastUpdated({ iso }: { iso?: string }) {
  if (!iso) return null;
  return (
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
      Last updated {formatDistanceToNow(new Date(iso), { addSuffix: true })}
    </p>
  );
}
