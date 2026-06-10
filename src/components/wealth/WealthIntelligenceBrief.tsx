import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Briefcase, Download, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PrivateAiBadge } from "@/components/privacy/PrivateAiBadge";
import { downloadIntelligenceBrief } from "@/lib/member/client";
import { formatInr } from "@/lib/wealth/calculations";
import type { WealthIntelligenceReport, WealthRecommendationCategory } from "@/lib/wealth/types";

function categoryLabel(category: WealthRecommendationCategory): string {
  switch (category) {
    case "allocation":
      return "ALLOCATION";
    case "tax":
      return "TAX";
    case "gold":
      return "GOLD";
    case "legal_structure":
      return "LEGAL STRUCTURE";
    default:
      return "ADVISORY";
  }
}

type Props = {
  report: WealthIntelligenceReport | null | undefined;
  isDemo?: boolean;
};

export function WealthIntelligenceBrief({ report, isDemo }: Props) {
  const [downloading, setDownloading] = useState(false);

  if (!report) return null;

  const preparedDate = format(new Date(report.preparedAt), "d MMMM yyyy");

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadIntelligenceBrief();
      toast.success("Brief saved to your vault and downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }

  if (report.status === "generating") {
    return (
      <section className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/8 via-transparent to-primary/5 p-6 lg:p-8">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          Preparing your Intelligence Brief…
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Aurelius is analysing your portfolio, tax position, and structure. This usually takes under a minute.
        </p>
      </section>
    );
  }

  if (report.status === "failed") {
    return (
      <section className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">Intelligence brief could not be generated.</p>
        <p className="text-xs text-muted-foreground mt-1">{report.errorMessage ?? "Try updating your wealth data again."}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 via-[#1a1814] to-primary/5 p-6 lg:p-8 shadow-[inset_0_1px_0_rgba(212,175,55,0.12)]">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <p className="label-caps !text-[10px] text-gold/80 mb-2 inline-flex items-center gap-2">
            <Sparkles className="h-3 w-3" /> Your Intelligence Brief
          </p>
          <h2 className="font-display text-2xl tracking-tight">Private memo</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Prepared for {report.preparedFor} · {preparedDate}
          </p>
          <span className="inline-flex mt-2 items-center rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-gold">
            Private & Encrypted
          </span>
          <PrivateAiBadge className="mt-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          {!isDemo ? (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="h-9 px-4 rounded-lg hairline text-xs inline-flex items-center gap-2 hover:border-gold/40 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download PDF
            </button>
          ) : (
            <span className="h-9 px-4 rounded-lg hairline text-xs inline-flex items-center gap-2 text-muted-foreground">
              PDF in vault (demo)
            </span>
          )}
          <Link
            to="/dashboard/experts"
            className="h-9 px-4 rounded-lg bg-foreground text-background text-xs inline-flex items-center gap-2"
          >
            <Briefcase className="h-3.5 w-3.5" /> Discuss with an Expert
          </Link>
        </div>
      </div>

      {report.summaryLine && (
        <p className="text-sm leading-relaxed border-l-2 border-gold/40 pl-4 mb-6 text-foreground/90">
          {report.summaryLine}
        </p>
      )}

      <div className="space-y-4">
        {report.recommendations.map((rec, index) => (
          <article
            key={rec.id}
            className="rounded-xl border border-border/50 bg-background/30 p-4 lg:p-5"
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-gold font-medium">
                {categoryLabel(rec.category)}
              </span>
              <span className="text-[10px] text-muted-foreground">· Recommendation {index + 1}</span>
            </div>
            <h3 className="font-medium text-base mb-3">{rec.title}</h3>
            <div className="grid lg:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">What to do</p>
                <p className="leading-relaxed">{rec.whatToDo}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Why</p>
                <p className="leading-relaxed text-muted-foreground">{rec.why}</p>
              </div>
            </div>
            {(rec.estimatedBenefitInr != null || rec.estimatedBenefitLabel) && (
              <p className="text-sm text-gold mt-3 pt-3 border-t border-border/40">
                Estimated benefit:{" "}
                {rec.estimatedBenefitInr != null ? formatInr(rec.estimatedBenefitInr) : ""}
                {rec.estimatedBenefitLabel ? ` (${rec.estimatedBenefitLabel})` : ""}
              </p>
            )}
          </article>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-6 pt-4 border-t border-border/30">
        Confidential — Aurelius Private. For {report.preparedFor} only.
      </p>
    </section>
  );
}
