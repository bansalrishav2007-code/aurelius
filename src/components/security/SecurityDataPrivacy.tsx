import { useState } from "react";
import { ChevronDown, Download, ShieldCheck } from "lucide-react";

type Props = {
  onExport: () => void;
};

const DATA_STORED = [
  "Profile & membership details",
  "Wealth overview & asset allocations",
  "Tax calculator inputs & reports",
  "Vault document metadata (files encrypted separately)",
  "Goals, succession plans & legal entities",
  "AI conversation history & insights",
  "Security settings & login history",
];

export function SecurityDataPrivacy({ onExport }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="glass rounded-2xl p-6 space-y-4">
      <h2 className="font-display text-lg flex items-center gap-2">
        <Download className="h-4 w-4" /> Data & privacy
      </h2>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between panel-muted rounded-xl px-4 py-3 text-sm text-left"
      >
        What data we store
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="rounded-xl border border-border/40 p-4 space-y-3 text-xs text-muted-foreground">
          <ul className="space-y-1.5">
            {DATA_STORED.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <p>
            <strong className="text-foreground">Retention:</strong> Active membership data is retained while your account
            is active. Deleted accounts enter a 30-day cool-off, then permanent erasure.
          </p>
          <p>
            <strong className="text-foreground">Access:</strong> Only you and authorised Aurelius systems can access
            your data. Experts see only what you explicitly share.
          </p>
          <p>
            <strong className="text-foreground">DPDP Act 2023:</strong> Aurelius processes personal data lawfully, with
            consent, for specified purposes. Data is stored in India (Mumbai · Bengaluru). You may request access,
            correction, or erasure at any time.
          </p>
          <p>
            <strong className="text-foreground">Right to erasure:</strong> Use &quot;Delete my account&quot; to begin
            permanent deletion after the cool-off period. You may also download your data before deletion.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onExport}
        className="h-10 px-4 rounded-xl border border-border text-sm inline-flex items-center gap-2 hover:bg-muted/30"
      >
        <ShieldCheck className="h-3.5 w-3.5" /> Download my data
      </button>
    </section>
  );
}
