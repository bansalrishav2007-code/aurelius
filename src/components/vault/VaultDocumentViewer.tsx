import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Loader2, X } from "lucide-react";
import type { DocumentAnalysis, VaultDocument } from "@/lib/vault/types";
import { vaultDocumentUrl } from "@/lib/platform/client";
import { VaultAiInsightsPanel } from "./VaultAiInsightsPanel";

type Props = {
  doc: VaultDocument;
  onClose: () => void;
  onAnalysisComplete: (analysis: DocumentAnalysis) => void;
};

function isPreviewable(mime: string, name: string): "pdf" | "image" | "download" {
  if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  return "download";
}

export function VaultDocumentViewer({ doc, onClose, onAnalysisComplete }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const preview = isPreviewable(doc.mimeType, doc.name);

  useEffect(() => {
    let revoked: string | null = null;
    setLoading(true);

    fetch(vaultDocumentUrl(doc.id, true), { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load document");
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
      })
      .catch(() => setBlobUrl(null))
      .finally(() => setLoading(false));

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [doc.id]);

  function handleDownload() {
    window.open(vaultDocumentUrl(doc.id, false), "_blank", "noopener");
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/80 backdrop-blur-sm">
      <div className="flex flex-1 min-w-0 flex-col lg:flex-row">
        {/* Viewer */}
        <div className="flex-[3] flex flex-col min-w-0 bg-[#0a0e1a]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2035]">
            <h2 className="font-display text-lg truncate pr-4">{doc.name}</h2>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                className="h-9 px-4 rounded-xl border border-[#c9a84c]/40 text-xs text-[#c9a84c] inline-flex items-center gap-2 hover:bg-[#c9a84c]/10"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            {loading ? (
              <Loader2 className="h-8 w-8 text-[#c9a84c] animate-spin" />
            ) : preview === "pdf" && blobUrl ? (
              <iframe
                src={blobUrl}
                title={doc.name}
                className="w-full h-full min-h-[60vh] rounded-lg border border-[#1a2035] bg-white/5"
              />
            ) : preview === "image" && blobUrl ? (
              <img
                src={blobUrl}
                alt={doc.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <div className="text-center max-w-sm">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-[#c9a84c]/60 mb-4" />
                <p className="text-sm font-medium mb-2">Download to view</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Excel and Word files cannot be previewed in-browser. Download to open locally.
                </p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="h-10 px-5 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium"
                >
                  Download file
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AI panel */}
        <div className="flex-[2] min-w-[300px] max-lg:max-h-[45vh] border-t lg:border-t-0 lg:border-l border-[#1a2035]">
          <VaultAiInsightsPanel doc={doc} onAnalysisComplete={onAnalysisComplete} />
        </div>
      </div>
    </div>
  );
}
