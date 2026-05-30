import { createFileRoute } from "@tanstack/react-router";
import { TrustPage, TrustSection } from "@/components/TrustPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Aureliuss" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <TrustPage
      title="Privacy Policy"
      subtitle="How Aureliuss handles your data with the discretion expected of a private wealth institution."
    >
      <TrustSection title="Confidentiality first">
        <p>
          Aureliuss is designed for principals, promoters, and family offices. We collect only information necessary to
          provide private wealth intelligence, secure document custody, and compliance support.
        </p>
      </TrustSection>
      <TrustSection title="Data we process">
        <p>Identity and contact details provided during invite-only onboarding; documents you upload to your encrypted vault; AI conversation content to deliver the copilot service.</p>
      </TrustSection>
      <TrustSection title="India residency">
        <p>Member data and documents are intended to remain within India-resident infrastructure, aligned with DPDP Act 2023 principles and applicable RBI/SEBI advisory standards.</p>
      </TrustSection>
      <TrustSection title="Your rights">
        <p>Members may request export or deletion of personal data subject to statutory retention requirements. Contact the private office for any data subject request.</p>
      </TrustSection>
    </TrustPage>
  );
}
