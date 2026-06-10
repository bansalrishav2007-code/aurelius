import { format } from "date-fns";
import { Sparkles, X } from "lucide-react";
import type { VaultDocument } from "@/lib/vault/types";

type Props = {
  doc: VaultDocument;
  onClose: () => void;
};

export function DocumentAnalysisModal({ doc, onClose }: Props) {
  const analysis = doc.analysis;
  const sections = analysis?.sections;

  const keyFigures =
    sections?.keyFigures ??
    analysis?.keyFacts?.join("\n") ??
    "No figures extracted yet.";

  const parties = extractParties(analysis?.summary ?? sections?.documentSummary ?? "");
  const dates = extractDates(keyFigures + (analysis?.summary ?? ""));
  const actions =
    sections?.actionItems ??
    analysis?.discussionPoints?.map((p) => `• ${p}`).join("\n") ??
    "Review with your advisor.";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-gold/20 bg-[#0a0e1a] shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2035] sticky top-0 bg-[#0a0e1a]">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-gold shrink-0" />
            <h2 className="font-display text-base truncate">AI extraction — {doc.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 text-xs">
          <Section title="Key financial figures" body={keyFigures} />
          {dates.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-gold mb-2">Important dates</h3>
              <ul className="space-y-1 text-muted-foreground">
                {dates.map((d) => (
                  <li key={d}>• {d}</li>
                ))}
              </ul>
            </div>
          )}
          {parties.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-gold mb-2">Parties mentioned</h3>
              <ul className="space-y-1 text-muted-foreground">
                {parties.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
          )}
          <Section title="Suggested actions" body={actions} />
          {analysis?.generatedAt && (
            <p className="text-[10px] text-muted-foreground">
              Generated {format(new Date(analysis.generatedAt), "d MMM yyyy, h:mm a")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider text-gold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}

function extractDates(text: string): string[] {
  const matches = text.match(/\b\d{1,2}[\s/-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s/-]\d{2,4}\b/gi) ?? [];
  const fy = text.match(/FY\s*20\d{2}[-–]?\d{2,4}/gi) ?? [];
  return [...new Set([...matches, ...fy])].slice(0, 6);
}

function extractParties(text: string): string[] {
  const lines = text.split(/[.\n]/).filter((l) =>
    /trustee|director|assesse|company|bank|ca |chartered|beneficiary/i.test(l),
  );
  return lines.map((l) => l.trim()).filter(Boolean).slice(0, 5);
}
