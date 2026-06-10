import { Download, FolderInput, Share2, Trash2, X } from "lucide-react";
import { VAULT_UPLOAD_CATEGORIES } from "@/lib/vault/categories";
import type { VaultUploadCategory } from "@/lib/vault/categories";

type Props = {
  count: number;
  onClear: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onMove: (category: VaultUploadCategory) => void;
  onShareExpert: () => void;
  busy?: boolean;
};

export function DocumentsBulkBar({
  count,
  onClear,
  onDownload,
  onDelete,
  onMove,
  onShareExpert,
  busy,
}: Props) {
  if (count === 0) return null;

  return (
    <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-gold/30 bg-[#0a0e1a]/95 px-4 py-3 backdrop-blur-sm">
      <span className="text-xs text-gold font-medium">{count} selected</span>
      <button
        type="button"
        disabled={busy}
        onClick={onDownload}
        className="h-8 px-3 rounded-lg border border-border/50 text-xs inline-flex items-center gap-1.5 hover:border-gold/40 disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" /> Download ZIP
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onShareExpert}
        className="h-8 px-3 rounded-lg border border-sky-500/40 text-sky-400 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
      >
        <Share2 className="h-3.5 w-3.5" /> Share with expert
      </button>
      <select
        disabled={busy}
        defaultValue=""
        onChange={(e) => {
          const val = e.target.value as VaultUploadCategory;
          if (val) {
            onMove(val);
            e.target.value = "";
          }
        }}
        className="h-8 rounded-lg border border-border/50 bg-[#0a0e1a] px-2 text-xs text-muted-foreground"
      >
        <option value="">Move to category…</option>
        {VAULT_UPLOAD_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="h-8 px-3 rounded-lg border border-destructive/40 text-destructive text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
