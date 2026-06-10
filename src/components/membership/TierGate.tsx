import type { ReactNode } from "react";
import { Lock, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PublicSession } from "@/lib/auth/types";
import {
  canAccessFeature,
  FEATURE_LABELS,
  type MembershipFeature,
  TIER_LABELS,
  upgradeLabelForFeature,
} from "@/lib/membership/access";

type TierGateProps = {
  session: PublicSession;
  feature: MembershipFeature;
  children: ReactNode;
  title?: string;
};

export function TierGate({ session, feature, children, title }: TierGateProps) {
  if (canAccessFeature(session.tier, feature)) {
    return <>{children}</>;
  }

  const requiredTier = upgradeLabelForFeature(feature);
  const featureLabel = FEATURE_LABELS[feature];

  return (
    <div className="p-5 lg:p-10 max-w-2xl mx-auto">
      <div className="glass rounded-2xl p-8 text-center border border-gold/20">
        <div className="h-14 w-14 rounded-2xl bg-gold/10 grid place-items-center mx-auto mb-5">
          <Lock className="h-6 w-6 text-gold" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-2">{TIER_LABELS[session.tier]} plan</p>
        <h1 className="font-display text-2xl tracking-tight">
          {title ?? featureLabel}
        </h1>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-md mx-auto">
          This is available on the <span className="text-foreground">{requiredTier}</span> plan.
          Request an upgrade and our private office will review your request manually.
        </p>
        <Link
          to="/membership"
          search={{ upgrade: feature }}
          className="mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gold/15 text-gold text-sm font-medium hover:bg-gold/25 transition-colors"
        >
          Request upgrade <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
