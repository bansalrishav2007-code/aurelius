import { createFileRoute } from "@tanstack/react-router";
import { TrustPage, TrustSection } from "@/components/TrustPage";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — Aureliuss" }] }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <TrustPage title="Contact" subtitle="Reach the Aureliuss private office.">
      <TrustSection title="Private office">
        <p>For membership enquiries, submit a confidential application via the waitlist. Existing members should use in-platform advisory channels.</p>
      </TrustSection>
      <TrustSection title="Founder">
        <p className="text-foreground">Founder & Director — Rishav Aggarwal</p>
        <p>General correspondence: privateoffice@aureliuss.com (placeholder)</p>
      </TrustSection>
      <TrustSection title="Security reports">
        <p>Report vulnerabilities responsibly to security@aureliuss.com (placeholder). Please do not disclose issues publicly before coordination.</p>
      </TrustSection>
    </TrustPage>
  );
}
