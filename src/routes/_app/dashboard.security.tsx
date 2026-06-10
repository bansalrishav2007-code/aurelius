import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, KeyRound, Laptop, LogOut, MapPin, Shield, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { LastUpdated } from "@/components/client/LastUpdated";
import { ConfirmModal } from "@/components/client/ConfirmModal";
import { DemoFeatureLock } from "@/components/demo/DemoFeatureLock";
import { SecurityScoreCard } from "@/components/security/SecurityScoreCard";
import { SecurityAlerts } from "@/components/security/SecurityAlerts";
import { SecurityPasswordChange } from "@/components/security/SecurityPasswordChange";
import { SecurityNotificationPrefsPanel } from "@/components/security/SecurityNotificationPrefs";
import { SecurityDataPrivacy } from "@/components/security/SecurityDataPrivacy";
import { SecurityApiAccessLog } from "@/components/security/SecurityApiAccessLog";
import { SecurityEmergencyLock } from "@/components/security/SecurityEmergencyLock";
import { formatLoginStatus, formatSessionDuration } from "@/components/security/session-utils";
import {
  exportMemberData,
  fetchSecurityDashboard,
  patchSecuritySettings,
} from "@/lib/member/client";
import type {
  ApiAccessEntry,
  SecurityNotificationPrefs,
  SecurityProfile,
  SecurityScore,
  SecuritySession,
  SuspiciousLoginAlert,
  TrustedDevice,
} from "@/lib/security/types";
import { Route as AppRoute } from "@/routes/_app";

export const Route = createFileRoute("/_app/dashboard/security")({
  head: () => ({ meta: [{ title: "Security Centre — Aurelius" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    confirmDeletion: typeof search.confirmDeletion === "string" ? search.confirmDeletion : undefined,
  }),
  component: SecurityDashboardPage,
});

const ENCRYPTION_ITEMS = [
  "AES-256 encryption",
  "TLS 1.3 in transit",
  "Zero knowledge vault",
  "SOC 2 Type II",
  "Data residency: Mumbai · Bengaluru",
] as const;

type ConfirmState =
  | { type: "end_session"; sessionId: string; label: string }
  | { type: "end_all_sessions" }
  | { type: "disable_2fa" }
  | { type: "delete_account" }
  | { type: "remove_trusted"; deviceId: string; label: string }
  | { type: "emergency_lock" }
  | null;

function SecurityDashboardPage() {
  const { session } = AppRoute.useRouteContext();
  const { confirmDeletion } = Route.useSearch();
  const navigate = useNavigate();
  const isDemo = session.isDemo === true;

  const [profile, setProfile] = useState<SecurityProfile | null>(null);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [loginHistory, setLoginHistory] = useState<import("@/lib/security/types").LoginHistoryEntry[]>([]);
  const [consecutiveFailed, setConsecutiveFailed] = useState(0);
  const [suspiciousLogin, setSuspiciousLogin] = useState<SuspiciousLoginAlert | null>(null);
  const [securityScore, setSecurityScore] = useState<SecurityScore | null>(null);
  const [apiAccessLog, setApiAccessLog] = useState<ApiAccessEntry[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<SecurityNotificationPrefs | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const [twoFaMethod, setTwoFaMethod] = useState<"sms" | "authenticator">("authenticator");
  const [setupQr, setSetupQr] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [smsMobile, setSmsMobile] = useState("");

  async function load() {
    const data = await fetchSecurityDashboard();
    setProfile(data.profile);
    setSessions(data.sessions);
    setTrustedDevices(data.trustedDevices);
    setLoginHistory(data.loginHistory);
    setConsecutiveFailed(data.consecutiveFailedAttempts);
    setSuspiciousLogin(data.suspiciousLogin ?? null);
    setSecurityScore(data.securityScore);
    setApiAccessLog(data.apiAccessLog);
    setNotificationPrefs(data.notificationPrefs);
    setUpdatedAt(data.updatedAt);
    if (data.profile.twoFactorMethod) setTwoFaMethod(data.profile.twoFactorMethod);
  }

  useEffect(() => {
    load()
      .catch(() => toast.error("Unable to load security settings."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!confirmDeletion || isDemo) return;
    patchSecuritySettings({ action: "confirm_deletion", token: confirmDeletion })
      .then(() => {
        toast.success("Deletion confirmed. 30-day cool-off period has started.");
        navigate({ to: "/dashboard/security", search: {} });
        return load();
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Confirmation failed."));
  }, [confirmDeletion, isDemo, navigate]);

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.type === "end_session") {
        await patchSecuritySettings({ action: "revoke_session", sessionId: confirm.sessionId });
        toast.success("Session ended.");
      } else if (confirm.type === "end_all_sessions") {
        const res = await patchSecuritySettings({ action: "revoke_all_sessions" });
        toast.success(`Ended ${res.revoked ?? 0} other session(s).`);
      } else if (confirm.type === "disable_2fa") {
        await patchSecuritySettings({ action: "disable_2fa" });
        setSetupQr(null);
        setSetupSecret(null);
        setBackupCodes(null);
        toast.success("Two-factor authentication disabled.");
      } else if (confirm.type === "delete_account") {
        await patchSecuritySettings({ action: "request_deletion" });
        toast.success("Confirmation email sent.");
      } else if (confirm.type === "remove_trusted") {
        await patchSecuritySettings({ action: "remove_trusted_device", deviceId: confirm.deviceId });
        toast.success("Trusted device removed.");
      } else if (confirm.type === "emergency_lock") {
        const res = await patchSecuritySettings({ action: "emergency_lock" });
        toast.success("Account locked. Check your email to unlock.");
        if (res.devToken) toast.message(`Dev unlock token: ${res.devToken}`);
        window.location.href = "/login";
        return;
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function handleSecureAccount() {
    setBusy(true);
    try {
      await patchSecuritySettings({ action: "revoke_all_sessions" });
      await patchSecuritySettings({ action: "acknowledge_suspicious", secure: true });
      toast.success("Account secured. All other sessions ended.");
      await load();
    } catch {
      toast.error("Failed to secure account.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAcknowledgeSuspicious(secure: boolean) {
    setBusy(true);
    try {
      await patchSecuritySettings({ action: "acknowledge_suspicious", secure });
      toast.success(secure ? "Account secured." : "Login acknowledged.");
      await load();
    } catch {
      toast.error("Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNotificationChange(patch: Partial<SecurityNotificationPrefs>) {
    if (!notificationPrefs || isDemo) return;
    const next = { ...notificationPrefs, ...patch };
    setNotificationPrefs(next);
    try {
      await patchSecuritySettings({ action: "update_notification_prefs", notificationPrefs: patch });
    } catch {
      toast.error("Failed to save preferences.");
      await load();
    }
  }

  if (loading || !profile || !securityScore || !notificationPrefs) {
    return (
      <div className="p-5 lg:p-10 max-w-[1440px] mx-auto">
        <PageSkeleton rows={5} />
      </div>
    );
  }

  const otherSessions = sessions.filter((s) => !s.current);

  return (
    <div className="p-5 lg:p-10 max-w-[1440px] mx-auto space-y-8">
      <PageHeader
        title="Security Centre"
        subtitle="Sessions, two-factor authentication, login history, encryption status, and data controls."
      >
        <LastUpdated iso={updatedAt} />
      </PageHeader>

      <SecurityScoreCard score={securityScore} />

      <SecurityAlerts
        consecutiveFailed={consecutiveFailed}
        suspiciousLogin={suspiciousLogin}
        onSecureAccount={() => void handleSecureAccount()}
        onAcknowledgeSuspicious={(s) => void handleAcknowledgeSuspicious(s)}
        busy={busy}
      />

      {/* Active sessions */}
      <section className="glass rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-display text-lg flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-gold" /> Active sessions
          </h2>
          {!isDemo && otherSessions.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirm({ type: "end_all_sessions" })}
              className="text-xs text-destructive border border-destructive/30 rounded-lg px-3 py-1.5 hover:bg-destructive/10"
            >
              End all other sessions
            </button>
          )}
        </div>

        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="panel-muted rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <Laptop className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium flex flex-wrap items-center gap-2">
                    {s.deviceName}
                    <span className="text-muted-foreground font-normal">
                      · {s.browser}
                      {s.browserVersion ? ` ${s.browserVersion.split(".")[0]}` : ""}
                    </span>
                    {s.current && (
                      <span className="text-[10px] uppercase tracking-wider text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {s.location} · Last active{" "}
                    {format(new Date(s.lastActive), "dd MMM yyyy, HH:mm")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatSessionDuration(s.createdAt ?? s.lastActive)}
                  </p>
                </div>
              </div>
              {!s.current && !isDemo && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirm({ type: "end_session", sessionId: s.id, label: `${s.deviceName} (${s.browser})` })
                  }
                  className="text-xs text-destructive border border-destructive/40 rounded-lg px-3 py-1.5 hover:bg-destructive/10 inline-flex items-center gap-1 self-start sm:self-center"
                >
                  <LogOut className="h-3 w-3" /> End this session
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 2FA */}
        <section className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-gold" /> Two-factor authentication
          </h2>

          {isDemo ? (
            <DemoFeatureLock title="2FA locked in demo" description="Enable two-factor on your full membership account." />
          ) : (
            <>
              <div className="space-y-2">
                <div className="panel-muted rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm">📱 SMS OTP</span>
                  <span className={`text-xs ${profile.smsTwoFactorEnabled ? "text-success" : "text-muted-foreground"}`}>
                    {profile.smsTwoFactorEnabled ? "Active" : "Not set up"}
                  </span>
                </div>
                <div className="panel-muted rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm">🔐 Authenticator app</span>
                  <span
                    className={`text-xs ${profile.authenticatorTwoFactorEnabled ? "text-success" : "text-muted-foreground"}`}
                  >
                    {profile.authenticatorTwoFactorEnabled ? "Active" : "Not set up"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">You can enable both methods. Either code works at login.</p>

              <div className="flex gap-2">
                {(["authenticator", "sms"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTwoFaMethod(m)}
                    className={`flex-1 text-xs rounded-lg px-3 py-2 border transition-colors ${
                      twoFaMethod === m ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground"
                    }`}
                  >
                    {m === "authenticator" ? "Set up authenticator" : "Set up SMS"}
                  </button>
                ))}
              </div>

              {twoFaMethod === "authenticator" && !profile.authenticatorTwoFactorEnabled && (
                <div className="space-y-3">
                  {!setupQr ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const res = await patchSecuritySettings({ action: "start_authenticator_setup" });
                          setSetupQr(res.qrCodeUrl ?? null);
                          setSetupSecret(res.secret ?? null);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Setup failed.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="w-full h-10 rounded-xl bg-foreground text-background text-sm"
                    >
                      Show QR code (Google Authenticator / Authy)
                    </button>
                  ) : (
                    <>
                      <div className="text-center">
                        <img
                          src={setupQr}
                          alt="Authenticator QR code"
                          className="mx-auto rounded-lg border border-border/60 bg-white p-2"
                          width={200}
                          height={200}
                        />
                        {setupSecret && (
                          <p className="text-[10px] text-muted-foreground mt-2 break-all">Manual key: {setupSecret}</p>
                        )}
                      </div>
                      <input
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit code to confirm"
                        className="field-input text-center tracking-[0.3em]"
                        maxLength={6}
                      />
                      <button
                        type="button"
                        disabled={busy || verifyCode.length !== 6}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            const res = await patchSecuritySettings({
                              action: "confirm_authenticator_setup",
                              code: verifyCode,
                            });
                            setBackupCodes(res.backupCodes ?? null);
                            setSetupQr(null);
                            setVerifyCode("");
                            toast.success("Authenticator enabled. Backup codes saved to vault.");
                            await load();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Verification failed.");
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="w-full h-10 rounded-xl bg-foreground text-background text-sm disabled:opacity-40"
                      >
                        Confirm & enable
                      </button>
                    </>
                  )}
                </div>
              )}

              {twoFaMethod === "sms" && !profile.smsTwoFactorEnabled && (
                <div className="space-y-3">
                  <input
                    value={smsMobile}
                    onChange={(e) => setSmsMobile(e.target.value)}
                    placeholder="Registered mobile (+91…)"
                    className="field-input"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await patchSecuritySettings({ action: "enable_sms_2fa", mobile: smsMobile || undefined });
                        toast.success("SMS 2FA enabled.");
                        await load();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="w-full h-10 rounded-xl bg-foreground text-background text-sm"
                  >
                    Enable SMS OTP
                  </button>
                </div>
              )}

              {profile.twoFactorEnabled && (
                <button
                  type="button"
                  onClick={() => setConfirm({ type: "disable_2fa" })}
                  className="text-xs text-destructive border border-destructive/30 rounded-lg px-3 py-1.5"
                >
                  Disable all 2FA
                </button>
              )}

              {backupCodes && (
                <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-xs space-y-1">
                  <p className="font-medium text-gold">8 backup codes (shown once)</p>
                  <p className="text-muted-foreground">Saved to your vault automatically.</p>
                  <div className="grid grid-cols-2 gap-1 mt-2 font-mono">
                    {backupCodes.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg flex items-center gap-2">
            <Shield className="h-4 w-4 text-gold" /> Encryption status
          </h2>
          <ul className="space-y-3">
            {ENCRYPTION_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm panel-muted rounded-xl px-4 py-3">
                <Check className="h-4 w-4 text-success shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {!isDemo && (
        <SecurityPasswordChange
          onSubmit={async (current, next) => {
            await patchSecuritySettings({
              action: "change_password",
              currentPassword: current,
              newPassword: next,
            });
            toast.success("Password updated. Other sessions signed out.");
            await load();
          }}
        />
      )}

      {/* Login history */}
      <section className="glass rounded-2xl p-6 space-y-4 overflow-x-auto">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg">Login history</h2>
          {!isDemo && loginHistory.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                await patchSecuritySettings({ action: "mark_history_reviewed" });
                toast.success("Login history marked as reviewed.");
                await load();
              }}
              className="text-xs border border-gold/30 text-gold rounded-lg px-3 py-1.5"
            >
              Mark as reviewed
            </button>
          )}
        </div>
        {loginHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No login events yet. Sign in to start recording your login history.
          </p>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <th className="text-left py-2 pr-4">Date</th>
                <th className="text-left py-2 pr-4">Time</th>
                <th className="text-left py-2 pr-4">Device</th>
                <th className="text-left py-2 pr-4">Location</th>
                <th className="text-left py-2 pr-4">Status</th>
                <th className="text-left py-2">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loginHistory.map((h) => {
                const d = new Date(h.createdAt);
                const st = formatLoginStatus(h.status ?? (h.success ? "success" : "failed"));
                return (
                  <tr key={h.id} className="border-b border-border/20">
                    <td className="py-2.5 pr-4">{format(d, "dd MMM yyyy")}</td>
                    <td className="py-2.5 pr-4">{format(d, "HH:mm")}</td>
                    <td className="py-2.5 pr-4">
                      {h.deviceName} · {h.browser}
                    </td>
                    <td className="py-2.5 pr-4">{h.location}</td>
                    <td className={`py-2.5 pr-4 font-medium ${st.className}`}>{st.label}</td>
                    <td className="py-2.5 font-mono text-xs text-muted-foreground">{h.ipAddress ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <SecurityNotificationPrefsPanel
        prefs={notificationPrefs}
        disabled={isDemo}
        onChange={(patch) => void handleNotificationChange(patch)}
      />

      <SecurityApiAccessLog entries={apiAccessLog} />

      {/* Trusted devices */}
      <section className="glass rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-display text-lg">Trusted devices</h2>
          {!isDemo && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await patchSecuritySettings({ action: "trust_device", skipOtpDays: 30 });
                  toast.success("This device trusted for 30 days.");
                  await load();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed.");
                } finally {
                  setBusy(false);
                }
              }}
              className="text-xs border border-gold/30 text-gold rounded-lg px-3 py-1.5 hover:bg-gold/10"
            >
              Trust this device
            </button>
          )}
        </div>
        {trustedDevices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trusted devices yet.</p>
        ) : (
          <div className="space-y-2">
            {trustedDevices.map((d) => (
              <div key={d.id} className="panel-muted rounded-xl p-3 flex justify-between items-center gap-3">
                <div>
                  <p className="text-sm">
                    {d.deviceName} · {d.browser}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {d.location} · Trusted {format(new Date(d.trustedAt), "dd MMM yyyy")}
                  </p>
                </div>
                {!isDemo && (
                  <button
                    type="button"
                    onClick={() => setConfirm({ type: "remove_trusted", deviceId: d.id, label: d.deviceName })}
                    className="text-xs text-destructive"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <SecurityDataPrivacy onExport={() => exportMemberData().catch(() => toast.error("Export failed."))} />

        <section className="glass rounded-2xl p-6 space-y-4 border border-destructive/20">
          <h2 className="font-display text-lg flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" /> Delete my account
          </h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account after a 30-day cool-off. Email confirmation required.
          </p>
          {profile.deletionConfirmedAt ? (
            <p className="text-xs text-destructive">
              Deletion confirmed {format(new Date(profile.deletionConfirmedAt), "dd MMM yyyy")}.
            </p>
          ) : profile.deletionRequestedAt ? (
            <p className="text-xs text-gold">Confirmation email sent. Check your inbox.</p>
          ) : (
            !isDemo && (
              <button
                type="button"
                onClick={() => setConfirm({ type: "delete_account" })}
                className="h-10 px-4 rounded-xl border border-destructive/50 text-destructive text-sm hover:bg-destructive/10"
              >
                Delete my account
              </button>
            )
          )}
        </section>
      </div>

      {!isDemo && <SecurityEmergencyLock onLock={() => setConfirm({ type: "emergency_lock" })} />}

      <ConfirmModal
        open={confirm !== null}
        title={
          confirm?.type === "emergency_lock"
            ? "Emergency lock account?"
            : confirm?.type === "end_session"
              ? "End session?"
              : confirm?.type === "end_all_sessions"
                ? "End all other sessions?"
                : confirm?.type === "disable_2fa"
                  ? "Disable two-factor authentication?"
                  : confirm?.type === "delete_account"
                    ? "Delete your account?"
                    : confirm?.type === "remove_trusted"
                      ? "Remove trusted device?"
                      : "Confirm"
        }
        description={
          confirm?.type === "emergency_lock"
            ? "This immediately locks your account, ends all sessions, and sends an unlock email. Use only if your device was stolen."
            : confirm?.type === "end_session"
              ? `End the session on ${confirm.label}?`
              : confirm?.type === "end_all_sessions"
                ? "All sessions except this device will be ended."
                : confirm?.type === "disable_2fa"
                  ? "Your account will no longer require a code at login."
                  : confirm?.type === "delete_account"
                    ? "We'll email you a confirmation link."
                    : confirm?.type === "remove_trusted"
                      ? `Remove ${confirm.label} from trusted devices?`
                      : ""
        }
        confirmLabel={confirm?.type === "emergency_lock" ? "Lock account now" : "Confirm"}
        danger={
          confirm?.type === "emergency_lock" ||
          confirm?.type === "delete_account" ||
          confirm?.type === "end_session" ||
          confirm?.type === "end_all_sessions"
        }
        loading={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
