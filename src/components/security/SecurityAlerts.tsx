import { formatDistanceToNow } from "date-fns";
import { AlertTriangle } from "lucide-react";
import type { SuspiciousLoginAlert } from "@/lib/security/types";

type Props = {
  consecutiveFailed: number;
  suspiciousLogin?: SuspiciousLoginAlert | null;
  onSecureAccount: () => void;
  onAcknowledgeSuspicious: (secure: boolean) => void;
  busy?: boolean;
};

export function SecurityAlerts({
  consecutiveFailed,
  suspiciousLogin,
  onSecureAccount,
  onAcknowledgeSuspicious,
  busy,
}: Props) {
  return (
    <>
      {consecutiveFailed >= 3 && (
        <div className="glass rounded-2xl p-4 border border-destructive/30 bg-destructive/5">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                ⚠️ {consecutiveFailed} failed login attempts detected. Was this you?
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onSecureAccount}
                  className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background disabled:opacity-50"
                >
                  Yes, secure my account
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAcknowledgeSuspicious(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground disabled:opacity-50"
                >
                  No, this wasn&apos;t me
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {suspiciousLogin && (
        <div className="glass rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                New login detected from {suspiciousLogin.location} · {suspiciousLogin.deviceName} ·{" "}
                {suspiciousLogin.browser} ·{" "}
                {formatDistanceToNow(new Date(suspiciousLogin.createdAt), { addSuffix: true })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Was this you?</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAcknowledgeSuspicious(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gold/40 text-gold disabled:opacity-50"
                >
                  Yes, that was me
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAcknowledgeSuspicious(true)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive disabled:opacity-50"
                >
                  No, secure account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
