import type { VaultDocument } from "@/lib/vault/types";
import { formatVaultSize } from "@/lib/vault/storage";
import { getDocumentDisplayStatus } from "@/lib/documents/filters";

type Props = {
  documents: VaultDocument[];
};

export function DocumentsStatsBar({ documents }: Props) {
  const totalBytes = documents.reduce((sum, d) => sum + d.sizeBytes, 0);
  const analysed = documents.filter((d) => getDocumentDisplayStatus(d) === "analysed").length;
  const pending = documents.length - analysed;

  return (
    <div className="glass rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span>
        <span className="text-gold font-medium">{documents.length}</span>
        <span className="text-muted-foreground"> document{documents.length === 1 ? "" : "s"}</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">
        <span className="text-foreground">{formatVaultSize(totalBytes)}</span> used
      </span>
      <span className="text-muted-foreground">·</span>
      <span>
        <span className="text-gold font-medium">{analysed}</span>
        <span className="text-muted-foreground"> Analysed</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span>
        <span className="text-amber-400 font-medium">{pending}</span>
        <span className="text-muted-foreground"> Pending</span>
      </span>
    </div>
  );
}
