import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { requestExpertIntroduction } from "@/lib/experts/client";
import type { DashboardExpert } from "@/lib/experts/client";

const DEFAULT_MESSAGE = "I'd like to discuss my wealth planning requirements";

type Props = {
  expert: DashboardExpert;
  onClose: () => void;
  defaultMessage?: string;
};

export function IntroductionRequestModal({ expert, onClose, defaultMessage }: Props) {
  const [message, setMessage] = useState(defaultMessage ?? DEFAULT_MESSAGE);
  const [contactMethod, setContactMethod] = useState<"email" | "call" | "video">("email");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await requestExpertIntroduction(expert.id, { message, contactMethod });
      setConfirmText(res.message);
      setConfirmed(true);
    } catch (err) {
      setConfirmText(err instanceof Error ? err.message : "Request failed. Please try again.");
      setConfirmed(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        className="w-full max-w-md rounded-2xl border border-[#c9a84c]/20 bg-[#0a0e1a] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-lg">Request Introduction</h2>
            <p className="text-xs text-muted-foreground mt-1">to {expert.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {confirmed ? (
          <div className="text-center py-6">
            <Check className="h-10 w-10 text-[#c9a84c] mx-auto mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">{confirmText}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 h-10 px-6 rounded-xl border border-border/50 text-xs"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Message to expert</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
                className="w-full rounded-xl bg-[#1a2035]/50 border border-border/40 px-3 py-2 text-sm resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Preferred contact method</label>
              <div className="grid grid-cols-3 gap-2">
                {(["email", "call", "video"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setContactMethod(m)}
                    className={`h-9 rounded-lg text-xs capitalize ${
                      contactMethod === m
                        ? "bg-[#c9a84c]/15 border border-[#c9a84c]/50 text-[#c9a84c]"
                        : "border border-border/50 text-muted-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="w-full h-11 rounded-xl bg-[#c9a84c] text-[#0a0e1a] text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
