import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { PageHeader } from "@/components/client/PageHeader";
import { PageSkeleton } from "@/components/client/PageSkeleton";
import { ExpertDirectoryCard } from "@/components/experts/directory/ExpertDirectoryCard";
import { ExpertProfileModal } from "@/components/experts/directory/ExpertProfileModal";
import { IntroductionRequestModal } from "@/components/experts/directory/IntroductionRequestModal";
import { BookingModal } from "@/components/experts/BookingModal";
import {
  CITY_FILTERS,
  SORT_OPTIONS,
  SPECIALTY_FILTERS,
  type DirectoryCity,
  type DirectorySort,
  type DirectorySpecialty,
} from "@/lib/experts/directory";
import { fetchDashboardExperts, type DashboardExpert } from "@/lib/experts/client";

export const Route = createFileRoute("/_app/dashboard/experts")({
  head: () => ({ meta: [{ title: "Your Advisory Circle — Aurelius" }] }),
  component: ExpertsDirectoryPage,
});

function ExpertsDirectoryPage() {
  const [experts, setExperts] = useState<DashboardExpert[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<DirectorySpecialty | "all">("all");
  const [city, setCity] = useState<DirectoryCity | "all">("all");
  const [sort, setSort] = useState<DirectorySort>("most_requested");
  const [profileExpert, setProfileExpert] = useState<DashboardExpert | null>(null);
  const [introExpert, setIntroExpert] = useState<DashboardExpert | null>(null);
  const [bookExpert, setBookExpert] = useState<DashboardExpert | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardExperts({
        q: query.trim() || undefined,
        specialty: specialty === "all" ? undefined : specialty,
        city: city === "all" ? undefined : city,
        sort,
      });
      setExperts(data.experts);
    } catch {
      setExperts([]);
    } finally {
      setLoading(false);
    }
  }, [query, specialty, city, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  function openIntro(expert: DashboardExpert) {
    setProfileExpert(null);
    setIntroExpert(expert);
  }

  if (loading && experts.length === 0) {
    return (
      <div className="p-5 lg:p-10 max-w-[1400px] mx-auto">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-10 max-w-[1400px] mx-auto min-w-0">
      <PageHeader
        title="Your Advisory Circle"
        subtitle="Handpicked specialists for India's most discerning wealth holders"
      />

      <div className="relative max-w-xl mb-8">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, specialty, or city"
          className="w-full field-input pl-10 bg-[#0a0e1a]/80"
        />
      </div>

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {SPECIALTY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setSpecialty(f.value)}
              className={`px-4 h-9 rounded-lg text-xs whitespace-nowrap transition-colors ${
                specialty === f.value
                  ? "bg-[#c9a84c] text-[#0a0e1a] font-medium"
                  : "border border-border/50 text-muted-foreground hover:border-[#c9a84c]/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {CITY_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setCity(f.value)}
                className={`px-3 h-8 rounded-lg text-[11px] whitespace-nowrap ${
                  city === f.value
                    ? "bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30"
                    : "border border-border/40 text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as DirectorySort)}
            className="h-8 rounded-lg border border-border/50 bg-[#0a0e1a]/80 px-3 text-[11px] text-muted-foreground sm:ml-auto"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Updating results…</p>
      ) : experts.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border/50 bg-[#0a0e1a]/60">
          <Users className="h-10 w-10 mx-auto text-[#c9a84c]/40 mb-4" />
          <p className="font-display text-lg text-foreground mb-2">No specialists found.</p>
          <p className="text-sm text-muted-foreground">
            We&apos;re continuously expanding our advisory network.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {experts.map((expert) => (
            <ExpertDirectoryCard
              key={expert.id}
              expert={expert}
              onViewProfile={() => setProfileExpert(expert)}
              onRequestIntro={() => openIntro(expert)}
              onBook={() => setBookExpert(expert)}
            />
          ))}
        </div>
      )}

      {profileExpert && (
        <ExpertProfileModal
          expert={profileExpert}
          onClose={() => setProfileExpert(null)}
          onRequestIntro={() => openIntro(profileExpert)}
        />
      )}

      {introExpert && (
        <IntroductionRequestModal expert={introExpert} onClose={() => setIntroExpert(null)} />
      )}

      {bookExpert && (
        <BookingModal expert={bookExpert} onClose={() => setBookExpert(null)} />
      )}
    </div>
  );
}
