import { format } from "date-fns";
import { Download, Eye, Share2, Trash2 } from "lucide-react";
import type { VaultDocument } from "@/lib/vault/types";
import { displayCategory } from "@/lib/vault/categories";
import { expiryBadge } from "@/lib/vault/expiry";
import { formatVaultSize } from "@/lib/vault/storage";
import { DocumentFileIcon } from "./DocumentFileIcon";

type Props = {
  doc: VaultDocument;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onOpen: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
};

export function VaultDocumentCard({
  doc,
  selected,
  onSelect,
  onOpen,
  onPreview,
  onDownload,
  onDelete,
  onShare,
}: Props) {
  const badge = expiryBadge(doc.expiryDate);

  return (
    <div
      className={`group panel-elevated rounded-2xl p-5 text-left w-full hover:ring-1 hover:ring-[#c9a84c]/30 transition-all relative ${
        selected ? "ring-1 ring-[#c9a84c]/50" : ""
      }`}
    >
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 left-3 h-4 w-4 rounded border-border/60 accent-[#c9a84c] cursor-pointer z-10"
        />
      )}

      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className={`flex justify-between items-start mb-3 ${onSelect ? "pl-6" : ""}`}>
          <DocumentFileIcon doc={doc} className="h-6 w-6" />
          <div className="flex flex-col items-end gap-1">
            {badge && (
              <span
                className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${
                  badge.tone === "red"
                    ? "bg-red-500/15 text-red-400 border border-red-500/30"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                }`}
              >
                {badge.label}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm font-medium truncate text-foreground" title={doc.name}>
          {doc.name}
        </p>

        <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-md bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20">
          {displayCategory(doc.category)}
        </span>

        <p className="text-xs text-muted-foreground mt-2">
          {format(new Date(doc.uploadedAt), "d MMM yyyy")} · {formatVaultSize(doc.sizeBytes)}
        </p>
      </button>

      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <ActionBtn
          label="Preview"
          onClick={() => (onPreview ?? onOpen)()}
          icon={<Eye className="h-3.5 w-3.5" />}
        />
        {onDownload && (
          <ActionBtn label="Download" onClick={onDownload} icon={<Download className="h-3.5 w-3.5" />} />
        )}
        {onShare && (
          <ActionBtn label="Share" onClick={onShare} icon={<Share2 className="h-3.5 w-3.5" />} />
        )}
        {onDelete && (
          <ActionBtn
            label="Delete"
            onClick={onDelete}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            destructive
          />
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  icon,
  destructive,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`h-8 flex-1 rounded-lg border text-[10px] inline-flex items-center justify-center gap-1 transition-colors ${
        destructive
          ? "border-destructive/30 text-destructive hover:bg-destructive/10"
          : "border-border/50 text-muted-foreground hover:border-[#c9a84c]/40 hover:text-[#c9a84c]"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
