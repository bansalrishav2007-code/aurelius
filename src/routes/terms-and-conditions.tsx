import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({ meta: [{ title: "Terms & Conditions — Aurelius" }] }),
  component: TermsAndConditionsPage,
});

const SECTIONS = [
  {
    title: "About Aurelius",
    body: "Aurelius Private Wealth Intelligence is a private digital platform providing wealth aggregation, portfolio tracking, financial document management, and AI-powered advisory insights to high-net-worth individuals, family offices, and founders in India.",
  },
  {
    title: "Eligibility",
    body: "Platform is available by invitation only to individuals with minimum net worth of ₹1 Crore or above. Aurelius reserves the right to approve or reject any membership application.",
  },
  {
    title: "Services Provided",
    body: "Wealth overview and asset tracking, document vault, AI advisor (informational only, not SEBI-registered advice), market intelligence, succession planning tools, expert introductions.",
  },
  {
    title: "AI Advisory Disclaimer",
    body: "The AI Advisor provides general financial information and insights only. It does not constitute SEBI-registered investment advice. Users should consult a qualified financial advisor before making investment decisions. Aurelius is not liable for any financial decisions made based on AI-generated content.",
  },
  {
    title: "Data Privacy & Security",
    body: "All data is encrypted with AES-256. Data is stored on servers within India and never sold to third parties. Users retain full ownership of their financial data. Aurelius may use anonymised, aggregated data for platform improvement.",
  },
  {
    title: "Document Vault",
    body: "Documents uploaded are stored securely and accessible only to the account holder. Aurelius staff do not access user documents except when required for technical support with explicit user consent.",
  },
  {
    title: "Membership & Billing",
    body: "Membership fees are non-refundable. Aurelius reserves the right to modify pricing with 30 days notice. Accounts may be suspended for violation of these terms.",
  },
  {
    title: "Prohibited Use",
    body: "Users may not share account access, use the platform for illegal financial activity, attempt to reverse-engineer the platform, or misrepresent their identity or net worth during onboarding.",
  },
  {
    title: "Limitation of Liability",
    body: "Aurelius is not liable for investment losses, data loss due to force majeure events, or third-party service failures.",
  },
  {
    title: "Governing Law",
    body: "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.",
  },
  {
    title: "Contact",
    body: "For queries: aurelius.teamx@gmail.com",
  },
] as const;

const CONTACT_EMAIL = "aurelius.teamx@gmail.com";
const GMAIL_COMPOSE_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}`;

function TermsAndConditionsPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#0a0e1a", fontFamily: '"DM Sans", system-ui, sans-serif' }}
    >
      <header className="px-6 lg:px-10 pt-8 pb-6 border-b border-white/5">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-[#c9a84c] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <Link
              to="/login"
              className="text-xs text-white/50 hover:text-[#c9a84c] transition-colors"
            >
              Login
            </Link>
          </div>
          <Logo size="md" />
        </div>
      </header>

      <main className="flex-1 px-6 lg:px-10 py-12">
        <article className="max-w-3xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#c9a84c]/80 mb-4">Legal</p>
          <h1
            className="text-4xl md:text-5xl tracking-tight mb-3 text-[#c9a84c]"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
          >
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-white/45 mb-10">Last updated: 8 June 2026</p>

          <div className="space-y-10">
            {SECTIONS.map((section, index) => (
              <section key={section.title}>
                <h2
                  className="text-xl md:text-2xl text-[#c9a84c] mb-3 tracking-tight"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                >
                  {index + 1}. {section.title}
                </h2>
                {section.title === "Contact" ? (
                  <p className="text-sm text-white/65 leading-relaxed">
                    For queries:{" "}
                    <a
                      href={GMAIL_COMPOSE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#c9a84c] font-semibold underline underline-offset-2 decoration-[#c9a84c]/50 hover:text-[#e8d5a3] hover:decoration-[#c9a84c] transition-colors"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </p>
                ) : (
                  <p className="text-sm text-white/65 leading-relaxed">{section.body}</p>
                )}
              </section>
            ))}
          </div>

          <div className="mt-14 pt-8 border-t border-white/10 flex flex-wrap gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#c9a84c] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
            <Link
              to="/login"
              className="text-sm text-white/50 hover:text-[#c9a84c] transition-colors"
            >
              Return to login
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
