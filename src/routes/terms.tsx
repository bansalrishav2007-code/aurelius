import { createFileRoute } from "@tanstack/react-router";
import { TrustPage, TrustSection } from "@/components/TrustPage";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — Aureliuss" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <TrustPage title="Terms of Service" subtitle="Private membership terms for Aureliuss Private Wealth Intelligence.">
      <TrustSection title="Invite-only membership">
        <p>Access is granted solely through personal invitation. Codes are non-transferable and may be revoked at the discretion of Aureliuss.</p>
      </TrustSection>
      <TrustSection title="Advisory disclaimer">
        <p>Aureliuss provides AI-assisted intelligence and document analysis. It does not replace qualified chartered accountants, tax counsel, or legal advisors. All outputs should be reviewed by your professional advisers before action.</p>
      </TrustSection>
      <TrustSection title="Acceptable use">
        <p>Members must not share credentials, resell access, or use the platform for unlawful purposes. We reserve the right to suspend access for misuse.</p>
      </TrustSection>
      <TrustSection title="Subscriptions">
        <p>Paid tiers, when enabled, renew per the selected plan. Refunds are handled per private office policy and applicable law.</p>
      </TrustSection>
    </TrustPage>
  );
}
