import { useState } from "react";
import { Copy, Link2, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { ShareAudience, VaultDocument } from "@/lib/vault/types";
import { createVaultShareLink } from "@/lib/platform/client";

type Props = {
  doc: VaultDocument;
  onClose: () => void;
  onLinkCreated?: () => void;
};

export function VaultShareModal({ doc, onClose, onLinkCreated }: Props) {
  const [audience, setAudience] = useState<ShareAudience>("expert");
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<{
    fullUrl: string;
    expiresAt: string;
    audience: ShareAudience;
  } | null>(null);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await createVaultShareLink(doc.id, audience);
      setLink({
        fullUrl: result.fullUrl,
        expiresAt: result.expiresAt,
        audience: result.audience,
      });
      onLinkCreated?.();
      toast.success("Secure one-time link created.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create link");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!link) return;
    void navigator.clipboard.writeText(link.fullUrl);
    toast.success("Link copied to clipboard.");
  }

  const accessLog = doc.activeShareLink?.accessLog ?? [];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#c9a84c]/20 bg-[#0a0e1a] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-lg">Secure share</h2>
            <p className="text-xs text-muted-foreground mt-1 truncate">{doc.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Generates a one-time view-only link that expires in 24 hours. Recipients cannot download.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setAudience("expert")}
            className={`h-10 rounded-xl text-xs px-3 transition-colors ${
              audience === "expert"
                ? "bg-[#c9a84c]/15 border border-[#c9a84c]/50 text-[#c9a84c]"
                : "border border-border/50 text-muted-foreground"
            }`}
          >
            Share with expert
          </button>
          <button
            type="button"
            onClick={() => setAudience("family")}
            className={`h-10 rounded-xl text-xs px-3 transition-colors ${
              audience === "family"
                ? "bg-[#c9a84c]/15 border border-[#c9a84c]/50 text-[#c9a84c]"
                : "border border-border/50 text-muted-foreground"
            }`}
          >
            Share with family member
          </button>
        </div>

        {!link ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleGenerate()}
            className="w-full h-11 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            {loading ? "Generating…" : "Generate secure link"}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-[#1a2035] p-3 text-xs break-all text-muted-foreground">
              {link.fullUrl}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Expires {format(new Date(link.expiresAt), "d MMM yyyy, h:mm a")} · View only · One-time use
            </p>
            <button
              type="button"
              onClick={copyLink}
              className="w-full h-10 rounded-xl border border-[#c9a84c]/40 text-[#c9a84c] text-xs inline-flex items-center justify-center gap-2"
            >
              <Copy className="h-3.5 w-3.5" /> Copy link
            </button>
          </div>
        )}

        {accessLog.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border/40">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Access log</p>
            <ul className="space-y-1.5 max-h-28 overflow-y-auto">
              {accessLog.map((entry, i) => (
                <li key={i} className="text-[10px] text-muted-foreground">
                  {format(new Date(entry.accessedAt), "d MMM h:mm a")} ·{" "}
                  {entry.audience === "expert" ? "Expert" : "Family member"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
