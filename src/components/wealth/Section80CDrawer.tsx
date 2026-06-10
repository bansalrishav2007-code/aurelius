import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

const INSTRUMENTS = [
  { name: "ELSS Mutual Funds", lockIn: "3 years" },
  { name: "PPF", lockIn: "15 years" },
  { name: "NSC", lockIn: "5 years" },
  { name: "Tax-saving FDs", lockIn: "5 years" },
  { name: "Life Insurance Premiums", lockIn: "Policy term" },
  { name: "EPF contributions", lockIn: "Until retirement" },
  { name: "Home Loan Principal Repayment", lockIn: "—" },
  { name: "Tuition Fees (up to 2 children)", lockIn: "—" },
  { name: "NPS (additional ₹50,000 under 80CCD(1B))", lockIn: "Until retirement" },
] as const;

type Section80CDrawerProps = {
  open: boolean;
  onClose: () => void;
  unusedAmount?: number;
};

export function Section80CDrawer({ open, onClose, unusedAmount }: Section80CDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-labelledby="section-80c-title"
        className="relative w-full max-w-md h-full overflow-y-auto border-l border-border/60 shadow-luxury animate-in slide-in-from-right duration-300"
        style={{ backgroundColor: "#0a0e1a" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-5 border-b border-border/40 bg-[#0a0e1a]/95 backdrop-blur-sm">
          <h2 id="section-80c-title" className="font-display text-xl text-gold leading-snug pr-4">
            Section 80C — Tax Saving Opportunities
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 h-8 w-8 grid place-items-center rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6 text-sm leading-relaxed">
          {unusedAmount != null && unusedAmount > 0 && (
            <p className="text-xs text-gold/90 border border-gold/25 rounded-lg px-3 py-2 bg-gold/5">
              You have approximately ₹{Math.round(unusedAmount).toLocaleString("en-IN")} of unused 80C headroom this financial year.
            </p>
          )}

          <section>
            <h3 className="font-display text-base text-foreground mb-2">What is 80C?</h3>
            <p className="text-muted-foreground">
              Section 80C of the Income Tax Act allows Indian taxpayers to claim deductions up to ₹1,50,000 per financial year,
              reducing their taxable income. Investments and payments listed below qualify toward this limit when made in the
              current financial year.
            </p>
          </section>

          <section>
            <h3 className="font-display text-base text-foreground mb-3">Eligible instruments</h3>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Instrument</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Lock-in</th>
                  </tr>
                </thead>
                <tbody>
                  {INSTRUMENTS.map((row) => (
                    <tr key={row.name} className="border-b border-border/20 last:border-0">
                      <td className="py-2.5 px-3 text-foreground/90">{row.name}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{row.lockIn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-[11px] text-muted-foreground/80 leading-relaxed border border-border/30 rounded-lg px-3 py-3 bg-muted/10">
            This information is for educational purposes only and does not constitute tax, legal, or investment advice.
            Eligibility, limits, and treatment may vary based on your income slab, residential status, and specific facts.
            Consult a qualified chartered accountant or tax advisor before acting.
          </p>

          <Link
            to="/dashboard/experts"
            onClick={onClose}
            className="block w-full text-center rounded-xl py-3 text-sm font-medium text-[#0a0e1a] transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#c9a84c" }}
          >
            Speak to Your Advisor
          </Link>
        </div>
      </aside>
    </div>
  );
}
