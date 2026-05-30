import { createFileRoute } from "@tanstack/react-router";
import { addWaitlistEntry } from "@/lib/auth/store.server";

export const Route = createFileRoute("/api/waitlist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          fullName?: string;
          email?: string;
          phone?: string;
          profession?: string;
          netWorthBand?: string;
          whyAccess?: string;
        };

        if (!body.fullName?.trim() || !body.email?.trim() || !body.phone?.trim() || !body.profession?.trim() || !body.whyAccess?.trim()) {
          return Response.json({ error: "Please complete all required fields." }, { status: 400 });
        }

        const result = await addWaitlistEntry({
          fullName: body.fullName.trim(),
          email: body.email.trim().toLowerCase(),
          phone: body.phone.trim(),
          profession: body.profession.trim(),
          netWorthBand: body.netWorthBand?.trim() || undefined,
          whyAccess: body.whyAccess.trim(),
        });

        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 409 });
        }

        return Response.json({ ok: true, id: result.id });
      },
    },
  },
});
