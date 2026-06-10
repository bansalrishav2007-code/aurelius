import { useEffect, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FolderInput,
  Loader2,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { DocumentAnalysis, VaultDocument } from "@/lib/vault/types";
import { expiryBadge } from "@/lib/vault/expiry";
import { vaultDocumentUrl } from "@/lib/platform/client";
import { VAULT_UPLOAD_CATEGORIES } from "@/lib/vault/categories";
import type { VaultUploadCategory } from "@/lib/vault/categories";
import { VaultAiInsightsPanel } from "./VaultAiInsightsPanel";

type Props = {
  doc: VaultDocument;
  onClose: () => void;
  onAnalysisComplete: (analysis: DocumentAnalysis) => void;
  onDelete?: () => void;
  onShare?: () => void;
  onMoveCategory?: (category: VaultUploadCategory) => void;
};

function isPreviewable(mime: string, name: string): "pdf" | "image" | "download" {
  if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  return "download";
}

function buildAiSummary(doc: VaultDocument, analysis?: DocumentAnalysis): string {
  if (analysis?.sections?.documentSummary) {
    const figures = analysis.sections.keyFigures?.trim();
    let text = `This document contains: ${analysis.sections.documentSummary}`;
    if (figures) text += `\n\n${figures}`;
    return text;
  }
  if (analysis?.summary) return `This document contains: ${analysis.summary}`;
  return "AI is analysing this document…";
}

export function VaultPreviewPanel({
  doc,
  onClose,
  onAnalysisComplete,
  onDelete,
  onShare,
  onMoveCategory,
}: Props) {
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

  const summary = buildAiSummary(doc, doc.analysis);
  const expiry = expiryBadge(doc.expiryDate);

  return (
    <div className="flex flex-col h-full min-h-0 border-l border-[#1a2035] bg-[#0a0e1a]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2035] shrink-0">
        <div className="min-w-0">
          <h2 className="font-display text-sm truncate pr-2">{doc.name}</h2>
          {expiry && (
            <span
              className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded mt-1 inline-block ${
                expiry.tone === "red"
                  ? "bg-red-500/15 text-red-400 border border-red-500/30"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              }`}
            >
              {expiry.label}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="h-64 lg:h-80 flex items-center justify-center p-3 bg-[#060912]">
          {loading ? (
            <Loader2 className="h-6 w-6 text-[#c9a84c] animate-spin" />
          ) : preview === "pdf" && blobUrl ? (
            <iframe
              src={blobUrl}
              title={doc.name}
              className="w-full h-full rounded-lg border border-[#1a2035] bg-white/5"
            />
          ) : preview === "image" && blobUrl ? (
            <img
              src={blobUrl}
              alt={doc.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <div className="text-center px-4">
              <FileSpreadsheet className="h-8 w-8 mx-auto text-[#c9a84c]/60 mb-2" />
              <p className="text-xs text-muted-foreground">Preview not available — download to view.</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-b border-[#1a2035]">
          <p className="text-[10px] uppercase tracking-wider text-[#c9a84c] mb-2">AI Summary</p>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>

        <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-[#1a2035]">
          <ActionButton onClick={handleDownload} icon={<Download className="h-3.5 w-3.5" />} label="Download" />
          {onShare && (
            <ActionButton onClick={onShare} icon={<Share2 className="h-3.5 w-3.5" />} label="Share" />
          )}
          {onMoveCategory && (
            <select
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value as VaultUploadCategory;
                if (val) {
                  onMoveCategory(val);
                  e.target.value = "";
                }
              }}
              className="h-8 rounded-lg border border-border/50 bg-[#0a0e1a] px-2 text-[10px] text-muted-foreground"
            >
              <option value="">Move to category…</option>
              {VAULT_UPLOAD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          {onDelete && (
            <ActionButton
              onClick={onDelete}
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Delete"
              destructive
            />
          )}
        </div>

        <div className="max-h-64 overflow-y-auto">
          <VaultAiInsightsPanel doc={doc} onAnalysisComplete={onAnalysisComplete} compact />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
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
      onClick={onClick}
      className={`h-8 px-3 rounded-lg border text-[10px] inline-flex items-center gap-1.5 ${
        destructive
          ? "border-destructive/40 text-destructive hover:bg-destructive/10"
          : "border-[#c9a84c]/40 text-[#c9a84c] hover:bg-[#c9a84c]/10"
      }`}
    >
      {destructive ? icon : label === "Move to category" ? <FolderInput className="h-3.5 w-3.5" /> : icon}
      {label}
    </button>
  );
}
