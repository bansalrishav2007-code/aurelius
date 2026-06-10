import { X } from "lucide-react";
import type { WealthAlert } from "@/lib/wealth/types";

const styles = {
  critical: "border-red-500/30 bg-red-500/10 text-red-200",
  warning: "border-gold/30 bg-gold/10 text-gold",
  success: "border-success/30 bg-success/10 text-success",
};

const icons = { critical: "🔴", warning: "🟡", success: "🟢" };

export function WealthAlerts({
  alerts,
  onDismiss,
  onAlertClick,
  isDemo,
}: {
  alerts?: WealthAlert[];
  onDismiss?: (id: string) => void;
  onAlertClick?: (alert: WealthAlert) => void;
  isDemo?: boolean;
}) {
  if (!alerts?.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const clickable = a.id === "unused-80c" && onAlertClick;
        return (
          <div
            key={a.id}
            className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${styles[a.severity]}`}
          >
            {clickable ? (
              <button
                type="button"
                onClick={() => onAlertClick(a)}
                className="text-left flex-1 hover:opacity-90 transition-opacity"
              >
                <span className="mr-2">{icons[a.severity]}</span>
                {a.message}
              </button>
            ) : (
              <p className="flex-1">
                <span className="mr-2">{icons[a.severity]}</span>
                {a.message}
              </p>
            )}
            {!isDemo && onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(a.id)}
                className="shrink-0 opacity-70 hover:opacity-100"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
