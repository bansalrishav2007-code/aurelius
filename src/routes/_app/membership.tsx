import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Crown, Lock, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/client/PageHeader";
import { DemoFeatureLock } from "@/components/demo/DemoFeatureLock";
import { fetchMemberProfile } from "@/lib/member/client";
import { submitUpgradeRequest } from "@/lib/membership/client";
import {
  canAccessFeature,
  FEATURE_LABELS,
  TIER_FEATURES,
  TIER_LABELS,
  TIER_USER_LIMITS,
  type MembershipFeature,
  type MembershipTier,
} from "@/lib/membership/access";
import type { InviteCode } from "@/lib/auth/types";
import { Route as AppRoute } from "@/routes/_app";

type MembershipSearch = { upgrade?: string };

export const Route = createFileRoute("/_app/membership")({
  validateSearch: (search: Record<string, unknown>): MembershipSearch => ({
    upgrade: typeof search.upgrade === "string" ? search.upgrade : undefined,
  }),
  head: () => ({ meta: [{ title: "Membership — Aurelius" }] }),
  component: MembershipPage,
});

const ALL_FEATURES: MembershipFeature[] = [
  "ai_advisor",
  "vault",
  "wealth_overview",
  "market_intelligence",
  "family_members",
  "shared_vault",
  "succession_planning",
  "legal_entities",
  "cap_table",
  "holding_structure",
  "dedicated_expert",
];

const upgradeTiers: { tier: InviteCode["tier"]; label: string }[] = [
  { tier: "family-office", label: "Family Office" },
  { tier: "founding", label: "Founder" },
];

function MembershipPage() {
  const { session } = AppRoute.useRouteContext();
  const { upgrade: upgradeFeature } = Route.useSearch();
  const isDemo = session.isDemo === true;
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchMemberProfile>>["profile"] | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<InviteCode["tier"]>("family-office");
  const [upgradeReason, setUpgradeReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMemberProfile()
      .then((r) => setProfile(r.profile))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (upgradeFeature && session.tier === "principal") {
      setUpgradeTier("family-office");
    } else if (upgradeFeature) {
      setUpgradeTier("founding");
    }
  }, [upgradeFeature, session.tier]);

  async function handleUpgradeRequest() {
    setSubmitting(true);
    try {
      await submitUpgradeRequest({ requestedTier: upgradeTier, reason: upgradeReason });
      toast.success("Upgrade request submitted. Our private office will review within 48 hours.");
      setUpgradeReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const included = TIER_FEATURES[session.tier as MembershipTier];

  return (
    <div className="p-5 lg:p-10 max-w-[1440px] mx-auto">
      <PageHeader title="Membership" subtitle="Your tier, included features, and upgrade options." />

      {isDemo && (
        <DemoFeatureLock
          title="You are viewing a demo membership"
          description="Full membership unlocks unlimited AI access, encrypted vault uploads, expert bookings, and private office support."
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 glass rounded-2xl p-6 border border-gold/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gold/15 grid place-items-center">
              <Crown className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="text-[10px] text-gold uppercase tracking-[0.2em]">Current tier</p>
              <p className="font-display text-2xl">{TIER_LABELS[session.tier]}</p>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border/30">
              <dt className="text-muted-foreground">Member</dt>
              <dd>{session.fullName}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-border/30">
              <dt className="text-muted-foreground">Users allowed</dt>
              <dd>{TIER_USER_LIMITS[session.tier]}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-border/30">
              <dt className="text-muted-foreground">Subscription</dt>
              <dd className="capitalize">{session.subscription ?? profile?.subscription ?? "none"}</dd>
            </div>
            {profile?.createdAt && (
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Member since</dt>
                <dd>{new Date(profile.createdAt).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="h-4 w-4 text-success" />
            <h2 className="font-display text-xl">What&apos;s included</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {ALL_FEATURES.map((feature) => {
              const unlocked = canAccessFeature(session.tier, feature);
              return (
                <li
                  key={feature}
                  className={`flex items-center gap-2.5 p-3 rounded-xl text-sm ${
                    unlocked ? "bg-success/5 border border-success/20" : "bg-muted/20 border border-border/30 opacity-70"
                  }`}
                >
                  {unlocked ? (
                    <Check className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={unlocked ? "text-foreground" : "text-muted-foreground"}>
                    {FEATURE_LABELS[feature]}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground mt-4">
            {included.length} features active on your {TIER_LABELS[session.tier]} plan.
          </p>
        </section>
      </div>

      {session.tier !== "founding" && (
        <section className="glass rounded-2xl p-6 mt-6 border border-gold/10">
          <h2 className="font-display text-xl mb-2">Request an upgrade</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upgrades are reviewed manually by the Aurelius private office. Typical response within 48 hours.
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            {upgradeTiers
              .filter((t) => t.tier !== session.tier)
              .map((t) => (
                <button
                  key={t.tier}
                  type="button"
                  onClick={() => setUpgradeTier(t.tier)}
                  className={`h-10 px-4 rounded-xl text-sm border transition-colors ${
                    upgradeTier === t.tier ? "border-gold bg-gold/10 text-gold" : "border-border/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
          </div>
          <textarea
            className="field-input resize-none w-full mb-3"
            rows={2}
            placeholder="Why do you need this upgrade? (optional)"
            value={upgradeReason}
            onChange={(e) => setUpgradeReason(e.target.value)}
          />
          <button
            onClick={handleUpgradeRequest}
            disabled={submitting}
            className="h-10 px-6 rounded-xl bg-gold/15 text-gold text-sm font-medium inline-flex items-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Request upgrade
          </button>
        </section>
      )}
    </div>
  );
}
