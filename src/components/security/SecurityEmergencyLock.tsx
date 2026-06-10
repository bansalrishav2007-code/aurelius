import { Lock } from "lucide-react";

type Props = {
  disabled?: boolean;
  onLock: () => void;
};

export function SecurityEmergencyLock({ disabled, onLock }: Props) {
  return (
    <section className="glass rounded-2xl p-6 space-y-4 border border-destructive/30">
      <h2 className="font-display text-lg text-destructive flex items-center gap-2">
        <Lock className="h-4 w-4" /> Emergency lock
      </h2>
      <p className="text-xs text-muted-foreground">
        Instantly lock your account if your phone or laptop is stolen. All sessions are terminated, no one can sign in,
        and unlock requires email verification.
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onLock}
        className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
      >
        🔴 Emergency Lock Account
      </button>
    </section>
  );
}
