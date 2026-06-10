import { useState } from "react";
import { KeyRound } from "lucide-react";

type Props = {
  disabled?: boolean;
  onSubmit: (current: string, next: string) => Promise<void>;
};

function passwordStrength(pw: string): { label: string; color: string; pct: number } {
  if (!pw) return { label: "", color: "", pct: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: "Weak", color: "bg-destructive", pct: 33 };
  if (score <= 3) return { label: "Fair", color: "bg-amber-500", pct: 66 };
  return { label: "Strong", color: "bg-success", pct: 100 };
}

export function SecurityPasswordChange({ disabled, onSubmit }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const strength = passwordStrength(next);
  const canSubmit = current && next.length >= 8 && next === confirm && !busy && !disabled;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onSubmit(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass rounded-2xl p-6 space-y-4">
      <h2 className="font-display text-lg flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-gold" /> Change password
      </h2>
      <p className="text-xs text-muted-foreground">
        On change, all other sessions are terminated and a confirmation email is sent.
      </p>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 max-w-md">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          className="field-input"
          disabled={disabled || busy}
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New password"
          className="field-input"
          disabled={disabled || busy}
        />
        {next && (
          <div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${strength.color} transition-all`} style={{ width: `${strength.pct}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{strength.label}</p>
          </div>
        )}
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className="field-input"
          disabled={disabled || busy}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-10 px-4 rounded-xl bg-foreground text-background text-sm disabled:opacity-40"
        >
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
