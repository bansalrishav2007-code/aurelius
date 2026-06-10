import { Shield, X } from "lucide-react";
import { ExpertAvatar } from "@/components/experts/ExpertAvatar";
import type { DashboardExpert } from "@/lib/experts/client";

type Props = {
  expert: DashboardExpert;
  onClose: () => void;
  onRequestIntro: () => void;
};

export function ExpertProfileModal({ expert, onClose, onRequestIntro }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        className="w-full max-w-lg rounded-2xl border border-[#c9a84c]/20 bg-[#0a0e1a] max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 px-6 py-4 border-b border-border/40 bg-[#0a0e1a]/95 backdrop-blur-sm">
          <h2 className="font-display text-xl">Expert Profile</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <ExpertAvatar name={expert.name} photoUrl={expert.photoUrl} size="lg" />
            <div>
              <h3 className="font-display text-2xl">{expert.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {expert.profession} · {expert.city}
              </p>
              {expert.verified !== false && (
                <span className="inline-flex items-center gap-1 mt-2 text-[10px] uppercase tracking-wider text-[#c9a84c]">
                  <Shield className="h-3.5 w-3.5" /> Verified by Aurelius
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{expert.bio}</p>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-[#c9a84c] mb-2">
              Credentials & certifications
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {(expert.credentials ?? []).map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-[#c9a84c] mb-2">
              Areas of expertise
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(expert.expertiseAreas ?? expert.displayTags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-1 rounded-md border border-border/50 text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-[#c9a84c] mb-2">
              Notable client types
            </h4>
            <p className="text-xs text-muted-foreground">
              {(expert.notableClientTypes ?? []).join(" · ")}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Availability</span>
            <span
              className={
                expert.availabilityStatus === "waitlist"
                  ? "text-amber-400"
                  : "text-emerald-400"
              }
            >
              {expert.availabilityStatus === "waitlist"
                ? "Waitlist only"
                : "Accepting new clients"}
            </span>
          </div>

          <button
            type="button"
            onClick={onRequestIntro}
            className="w-full h-11 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium hover:bg-[#c9a84c]/90"
          >
            Request Introduction
          </button>
        </div>
      </div>
    </div>
  );
}
