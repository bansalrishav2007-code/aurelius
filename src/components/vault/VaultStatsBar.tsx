import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import * as Progress from "@radix-ui/react-progress";
import type { VaultDocument } from "@/lib/vault/types";
import {
  formatVaultSize,
  VAULT_STORAGE_LIMIT_BYTES,
  vaultStoragePercent,
  vaultStorageWarning,
} from "@/lib/vault/storage";

type Props = {
  documents: VaultDocument[];
};

export function VaultStatsBar({ documents }: Props) {
  const totalBytes = documents.reduce((sum, d) => sum + d.sizeBytes, 0);
  const lastUploaded = documents.reduce(
    (latest, d) => (d.uploadedAt > latest ? d.uploadedAt : latest),
    documents[0]?.uploadedAt ?? "",
  );
  const pct = vaultStoragePercent(totalBytes);
  const warn = vaultStorageWarning(totalBytes);

  const stats = [
    { label: "Total documents", value: String(documents.length) },
    {
      label: "Last uploaded",
      value: lastUploaded ? format(new Date(lastUploaded), "d MMM yyyy") : "—",
    },
  ];

  return (
    <div className="mb-8 space-y-4">
      <div className="rounded-2xl border border-border/40 bg-[#0a0e1a]/80 px-5 py-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Storage used</p>
          {warn && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Above 80% capacity
            </span>
          )}
        </div>
        <p className="text-sm text-foreground mb-3">
          <span className="text-[#c9a84c] font-medium">{formatVaultSize(totalBytes)}</span>
          <span className="text-muted-foreground"> of 1 GB used</span>
          <span className="text-muted-foreground text-xs ml-2">({pct.toFixed(1)}%)</span>
        </p>
        <Progress.Root
          value={pct}
          className="relative h-2 w-full overflow-hidden rounded-full bg-[#1a2035]"
        >
          <Progress.Indicator
            className={`h-full transition-all duration-300 ${warn ? "bg-amber-500" : "bg-[#c9a84c]"}`}
            style={{ width: `${pct}%` }}
          />
        </Progress.Root>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border/40 bg-[#0a0e1a]/80 px-5 py-4"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-display text-xl mt-1 text-[#c9a84c]">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
