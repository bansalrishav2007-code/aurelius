import { formatDistanceToNow } from "date-fns";
import type { ApiAccessEntry } from "@/lib/security/types";

type Props = {
  entries: ApiAccessEntry[];
};

export function SecurityApiAccessLog({ entries }: Props) {
  return (
    <section className="glass rounded-2xl p-6 space-y-4">
      <h2 className="font-display text-lg">API access log</h2>
      <p className="text-xs text-muted-foreground">
        Transparency on which features accessed your data recently.
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No feature access recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="panel-muted rounded-xl px-4 py-3">
              <p className="text-sm font-medium">{entry.feature}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(entry.accessedAt), { addSuffix: true })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
