import { format } from "date-fns";
import type { VaultDocument } from "@/lib/vault/types";
import { DocumentFileIcon } from "./DocumentFileIcon";

type Props = {
  documents: VaultDocument[];
  onOpen: (doc: VaultDocument) => void;
};

export function VaultRecentlyViewed({ documents, onOpen }: Props) {
  if (documents.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Recently viewed</p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {documents.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => onOpen(doc)}
            className="shrink-0 w-44 rounded-xl border border-border/40 bg-[#0a0e1a]/80 p-3 text-left hover:border-[#c9a84c]/40 transition-colors"
          >
            <DocumentFileIcon doc={doc} className="h-5 w-5 mb-2" />
            <p className="text-xs font-medium truncate" title={doc.name}>
              {doc.name}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {format(new Date(doc.uploadedAt), "d MMM")}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
