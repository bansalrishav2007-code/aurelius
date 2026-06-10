import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MessageSquare } from "lucide-react";
import { ContactChannels } from "@/components/ContactChannels";
import { TrustPage, TrustSection } from "@/components/TrustPage";
import { submitContactForm } from "@/lib/founder/client";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — Aurelius" }] }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await submitContactForm(form);
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <TrustPage title="Contact" subtitle="Reach the Aurelius private office.">
      <TrustSection title="Send a message">
        {sent ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="panel rounded-2xl p-6 border border-success/20">
            <p className="text-sm text-success">Your message has been received. The private office will respond shortly.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
              required
              className="field-input"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email address"
              required
              className="field-input"
            />
            <input
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Subject"
              className="field-input"
            />
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="How can we assist you?"
              required
              rows={5}
              className="field-input resize-none"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-6 rounded-xl bg-foreground text-background text-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Submit enquiry"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </TrustSection>

      <TrustSection title="Private office">
        <p className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4 text-gold shrink-0" />
          For membership enquiries, submit a confidential application via the waitlist. Existing members should use in-platform advisory channels.
        </p>
      </TrustSection>
      <TrustSection title="Direct contact">
        <ContactChannels stackOnMobile />
      </TrustSection>
      <TrustSection title="Security reports">
        <p>Report vulnerabilities responsibly to security@aurelius.com. Please do not disclose issues publicly before coordination.</p>
      </TrustSection>
    </TrustPage>
  );
}
