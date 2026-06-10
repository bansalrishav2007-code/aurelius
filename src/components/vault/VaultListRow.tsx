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
  onDownload?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
};

export function VaultListRow({
  doc,
  selected,
  onSelect,
  onOpen,
  onDownload,
  onDelete,
  onShare,
}: Props) {
  const badge = expiryBadge(doc.expiryDate);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-border/30 bg-[#0a0e1a]/60 hover:border-[#c9a84c]/30 transition-colors ${
        selected ? "border-[#c9a84c]/50" : ""
      }`}
    >
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="h-4 w-4 rounded accent-[#c9a84c] shrink-0"
        />
      )}
      <DocumentFileIcon doc={doc} className="h-4 w-4 shrink-0" />
      <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-left">
        <p className="text-sm truncate font-medium">{doc.name}</p>
      </button>
      {badge && (
        <span
          className={`hidden md:inline text-[9px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
            badge.tone === "red"
              ? "bg-red-500/15 text-red-400"
              : "bg-amber-500/15 text-amber-400"
          }`}
        >
          {badge.label}
        </span>
      )}
      <span className="hidden sm:inline text-[10px] text-[#c9a84c] shrink-0 w-28 truncate">
        {displayCategory(doc.category)}
      </span>
      <span className="hidden lg:inline text-xs text-muted-foreground shrink-0 w-16">
        {formatVaultSize(doc.sizeBytes)}
      </span>
      <span className="hidden md:inline text-xs text-muted-foreground shrink-0 w-24">
        {format(new Date(doc.uploadedAt), "d MMM yyyy")}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <IconBtn onClick={onOpen} icon={<Eye className="h-3.5 w-3.5" />} label="Preview" />
        {onDownload && (
          <IconBtn onClick={onDownload} icon={<Download className="h-3.5 w-3.5" />} label="Download" />
        )}
        {onShare && (
          <IconBtn onClick={onShare} icon={<Share2 className="h-3.5 w-3.5" />} label="Share" />
        )}
        {onDelete && (
          <IconBtn
            onClick={onDelete}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label="Delete"
            destructive
          />
        )}
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  icon,
  label,
  destructive,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
        destructive
          ? "text-muted-foreground hover:text-destructive"
          : "text-muted-foreground hover:text-[#c9a84c]"
      }`}
    >
      {icon}
    </button>
  );
}
