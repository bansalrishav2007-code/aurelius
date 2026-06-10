import { createFileRoute } from "@tanstack/react-router";
import { requireMemberSession } from "@/lib/auth/guard.server";
import {
  enrichDirectoryExpert,
  matchesDirectoryFilters,
  sortDirectoryExperts,
  type DirectoryCity,
  type DirectorySort,
  type DirectorySpecialty,
} from "@/lib/experts/directory";
import { getExpertAvailabilityFlags, listActiveExperts } from "@/lib/experts/store.server";
import { calculateBookingPrice, canBookExpert } from "@/lib/experts/pricing";
import type { ExpertCategory } from "@/lib/experts/types";

export const Route = createFileRoute("/api/member/experts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireMemberSession(request);
        if (!auth.ok) return auth.response;

        const url = new URL(request.url);
        const category = url.searchParams.get("category") as ExpertCategory | null;
        const specialty = (url.searchParams.get("specialty") ?? "all") as DirectorySpecialty | "all";
        const city = (url.searchParams.get("city") ?? "all") as DirectoryCity | "all";
        const sort = (url.searchParams.get("sort") ?? "most_requested") as DirectorySort;
        const query = url.searchParams.get("q") ?? "";

        let experts = await listActiveExperts(category ?? undefined);
        const tier = auth.session.tier;

        let directory = experts.map(enrichDirectoryExpert);
        directory = directory.filter((e) =>
          matchesDirectoryFilters(e, { query, specialty, city }),
        );
        directory = sortDirectoryExperts(directory, sort);

        const publicExperts = await Promise.all(
          directory.map(async (e) => {
            const pricing = calculateBookingPrice(e, tier);
            const flags = await getExpertAvailabilityFlags(e.id);
            const { pricePaise: _hidden, ...rest } = e;
            return {
              ...rest,
              canBook: canBookExpert(e, tier),
              discountPercent: pricing.discountPercent,
              availableNow: flags.availableNow,
              availableThisWeek: flags.availableThisWeek,
            };
          }),
        );

        return Response.json({ experts: publicExperts });
      },
    },
  },
});
