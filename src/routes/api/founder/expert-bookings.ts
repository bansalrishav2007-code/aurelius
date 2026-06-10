import { createFileRoute } from "@tanstack/react-router";
import { requireSuperAdmin } from "@/lib/auth/founder.service.server";
import { listAllBookings } from "@/lib/experts/store.server";

export const Route = createFileRoute("/api/founder/expert-bookings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await requireSuperAdmin(request.headers.get("cookie")))) {
          return Response.json({ error: "Founder access required." }, { status: 403 });
        }
        const bookings = await listAllBookings();
        return Response.json({ bookings });
      },
    },
  },
});
