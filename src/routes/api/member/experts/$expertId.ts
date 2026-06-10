import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import { getAvailableSlots, getCalendarSlots, getExpertById } from "@/lib/experts/store.server";
import { calculateBookingPrice, canBookExpert } from "@/lib/experts/pricing";
import { CATEGORY_SPECIALISATIONS } from "@/lib/experts/specialisations";

export const Route = createFileRoute("/api/member/experts/$expertId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const expert = await getExpertById(params.expertId);
        if (!expert || expert.status !== "active") {
          return Response.json({ error: "Expert not found." }, { status: 404 });
        }

        const tier = auth.session.tier;
        const pricing = calculateBookingPrice(expert, tier);
        const url = new URL(request.url);
        const duration = Number(url.searchParams.get("duration") ?? "60") as 30 | 60 | 90;
        const canBook = canBookExpert(expert, tier);
        const slots = canBook ? await getAvailableSlots(params.expertId, 21, duration) : [];
        const calendar = canBook ? await getCalendarSlots(params.expertId, duration, 21) : [];

        const { pricePaise: _hidden, ...publicExpert } = expert;
        return Response.json({
          expert: {
            ...publicExpert,
            canBook,
            discountPercent: pricing.discountPercent,
            specialisationTags: CATEGORY_SPECIALISATIONS[expert.category] ?? [],
          },
          slots,
          calendar,
        });
      },
    },
  },
});
