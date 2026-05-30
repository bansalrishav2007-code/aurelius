import { createFileRoute } from "@tanstack/react-router";
import { TrustPage, TrustSection } from "@/components/TrustPage";

export const Route = createFileRoute("/security")({
  head: () => ({ meta: [{ title: "Security — Aureliuss" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <TrustPage title="Security" subtitle="Institutional-grade controls for private wealth data.">
      <TrustSection title="Encryption">
        <p>Documents and sessions are protected with AES-256 at rest and TLS 1.3 in transit. Vault files are stored in isolated member-scoped paths with encryption-ready architecture.</p>
      </TrustSection>
      <TrustSection title="Access control">
        <p>Invite-only onboarding, HttpOnly session cookies, route-level guards, and API-level membership verification on all sensitive endpoints.</p>
      </TrustSection>
      <TrustSection title="Infrastructure">
        <p>Designed for SOC 2 Type II and ISO 27001 aligned operations. Production deployments should use managed secrets, audit logging, and regular penetration testing.</p>
      </TrustSection>
      <TrustSection title="Incident response">
        <p>Security concerns may be reported to the private office. We commit to timely investigation and member notification where required by law.</p>
      </TrustSection>
    </TrustPage>
  );
}
