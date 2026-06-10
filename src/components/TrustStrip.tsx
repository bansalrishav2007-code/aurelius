import { trustSignals } from "@/lib/mock-data";
import { ShieldCheck } from "lucide-react";

export function TrustStrip() {
  return (
    <div className="glass rounded-2xl px-5 py-3.5 flex items-center gap-5 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-2 shrink-0 pr-5 border-r border-border/50">
        <ShieldCheck className="h-4 w-4 text-success" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Enterprise Trust</span>
      </div>
      {trustSignals.map((t) => (
        <div key={t.label} className="shrink-0">
          <p className="text-[11px] font-medium text-foreground/90 leading-tight">{t.label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t.sub}</p>
        </div>
      ))}
    </div>
  );
}
