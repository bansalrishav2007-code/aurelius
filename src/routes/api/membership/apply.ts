import { createFileRoute } from "@tanstack/react-router";
import { sendApplicationUnderReviewEmail } from "@/lib/email/application.server";
import { getMembershipSettings } from "@/lib/membership/settings.server";
import { submitMembershipApplication, submitWaitlistInterest, logAdminActivity } from "@/lib/membership/service.server";

export const Route = createFileRoute("/api/membership/apply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          fullName?: string;
          phone?: string;
          email?: string;
          tierApplying?: "founding" | "principal" | "family-office";
          netWorthRange?: "1-5cr" | "5-25cr" | "25cr+";
          primaryNeed?: "tax" | "wealth" | "legal" | "all";
          hearAbout?: string;
          whyAccess?: string;
          waitlistOnly?: boolean;
        };

        const fullName = body.fullName?.trim() ?? "";
        const phone = body.phone?.trim() ?? "";
        const email = body.email?.trim().toLowerCase() ?? "";

        if (!fullName || !phone || !email.includes("@")) {
          return Response.json({ error: "Full name, phone, and valid email are required." }, { status: 400 });
        }

        const settings = await getMembershipSettings();
        const waitlistOnly = settings.inviteOnlyMode || body.waitlistOnly;

        let result: { ok: true; id: string } | { ok: false; error: string };
        if (waitlistOnly) {
          result = await submitWaitlistInterest({ fullName, phone, email });
        } else {
          if (!body.tierApplying || !body.netWorthRange || !body.primaryNeed || !body.whyAccess?.trim()) {
            return Response.json({ error: "Complete all application fields." }, { status: 400 });
          }
          result = await submitMembershipApplication({
            fullName,
            phone,
            email,
            tierApplying: body.tierApplying,
            netWorthRange: body.netWorthRange,
            primaryNeed: body.primaryNeed,
            hearAbout: body.hearAbout,
            whyAccess: body.whyAccess.trim(),
          });
        }

        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        await sendApplicationUnderReviewEmail({ to: email, fullName });
        await logAdminActivity(
          waitlistOnly ? "waitlist_joined" : "application_submitted",
          `${fullName} (${email})${waitlistOnly ? " joined waitlist" : ` applied for ${body.tierApplying}`}`,
        );

        return Response.json({ ok: true, id: result.id });
      },
    },
  },
});
