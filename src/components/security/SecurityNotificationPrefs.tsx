import type { SecurityNotificationPrefs } from "@/lib/security/types";

const ALERT_TYPES: { key: keyof Omit<SecurityNotificationPrefs, "channel">; label: string }[] = [
  { key: "loginNewDevice", label: "Login from new device" },
  { key: "failedLogin", label: "Failed login attempts" },
  { key: "advanceTax", label: "Advance tax reminders" },
  { key: "marketMovement", label: "Market movement alerts" },
  { key: "sgbIssuance", label: "SGB issuance alerts" },
  { key: "rebalancing", label: "Rebalancing reminders" },
  { key: "documentExpiry", label: "Document expiry alerts" },
  { key: "expertMessage", label: "Expert message received" },
];

type Props = {
  prefs: SecurityNotificationPrefs;
  disabled?: boolean;
  onChange: (patch: Partial<SecurityNotificationPrefs>) => void;
};

export function SecurityNotificationPrefsPanel({ prefs, disabled, onChange }: Props) {
  return (
    <section className="glass rounded-2xl p-6 space-y-4">
      <h2 className="font-display text-lg">Notification preferences</h2>
      <p className="text-xs text-muted-foreground">Choose which alerts you receive and how.</p>

      <div className="space-y-2">
        {ALERT_TYPES.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center justify-between panel-muted rounded-xl px-4 py-3 cursor-pointer"
          >
            <span className="text-sm">{label}</span>
            <input
              type="checkbox"
              checked={prefs[key]}
              disabled={disabled}
              onChange={(e) => onChange({ [key]: e.target.checked })}
              className="h-4 w-4 accent-gold"
            />
          </label>
        ))}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Channel</p>
        <div className="flex gap-2">
          {(["sms", "email", "both"] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ channel: ch })}
              className={`flex-1 text-xs rounded-lg px-3 py-2 border capitalize ${
                prefs.channel === ch ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground"
              }`}
            >
              {ch === "both" ? "SMS & Email" : ch}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
