import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { createBooking, listMemberBookings, listAllExperts } from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/member/expert-bookings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;
        const bookings = await listMemberBookings(auth.session.email);
        const experts = await listAllExperts();
        const enriched = bookings.map((b) => {
          const exp = experts.find((e) => e.id === b.expertId);
          return {
            ...b,
            expertName: exp?.name ?? "Expert",
            expertPhotoUrl: exp?.photoUrl,
          };
        });
        return Response.json({ bookings: enriched });
      },
      POST: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const body = (await request.json().catch(() => ({}))) as {
          expertId?: string;
          scheduledAt?: string;
          durationMinutes?: 30 | 60 | 90;
          serviceType?: string;
          notes?: string;
          agenda?: string;
          vaultBriefApproved?: boolean;
        };

        if (!body.expertId || !body.scheduledAt) {
          return Response.json({ error: "Expert and time slot are required." }, { status: 400 });
        }

        const result = await createBooking({
          expertId: body.expertId,
          memberEmail: auth.session.email,
          memberName: auth.session.fullName,
          memberTier: auth.session.tier,
          scheduledAt: body.scheduledAt,
          durationMinutes: body.durationMinutes,
          serviceType: body.serviceType as import("@/lib/experts/service-types").BookingServiceType | undefined,
          notes: body.notes,
          agenda: body.agenda,
          vaultBriefApproved: body.vaultBriefApproved,
        });

        if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
        return Response.json({ booking: result.booking });
      },
    },
  },
});
