import type { ExpertProfile } from "./types";

export type DirectorySpecialty =
  | "tax"
  | "investments"
  | "legal"
  | "insurance"
  | "nri"
  | "family-office";

export type DirectoryCity = "Mumbai" | "Delhi" | "Bangalore" | "Hyderabad";

export const SPECIALTY_FILTERS: { label: string; value: DirectorySpecialty | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Tax", value: "tax" },
  { label: "Investments", value: "investments" },
  { label: "Legal", value: "legal" },
  { label: "Insurance", value: "insurance" },
  { label: "NRI", value: "nri" },
  { label: "Family Office", value: "family-office" },
];

export const CITY_FILTERS: { label: string; value: DirectoryCity | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Mumbai", value: "Mumbai" },
  { label: "Delhi", value: "Delhi" },
  { label: "Bangalore", value: "Bangalore" },
  { label: "Hyderabad", value: "Hyderabad" },
];

export type DirectorySort = "most_requested" | "experience" | "newest";

export const SORT_OPTIONS: { label: string; value: DirectorySort }[] = [
  { label: "Most Requested", value: "most_requested" },
  { label: "Experience", value: "experience" },
  { label: "Newest", value: "newest" },
];

export type DirectoryExpert = ExpertProfile & {
  city: DirectoryCity;
  verified: boolean;
  displayTags: string[];
  tagline: string;
  credentials: string[];
  notableClientTypes: string[];
  availabilityStatus: "accepting" | "waitlist";
  directorySpecialty: DirectorySpecialty;
  introRequestCount: number;
};

export function enrichDirectoryExpert(expert: ExpertProfile): DirectoryExpert {
  const e = expert as DirectoryExpert;
  return {
    ...expert,
    city: e.city ?? "Mumbai",
    verified: e.verified ?? true,
    displayTags: e.displayTags ?? [expert.specialization],
    tagline: e.tagline ?? expert.specialization,
    credentials: e.credentials ?? [],
    notableClientTypes: e.notableClientTypes ?? ["HNIs", "Founders"],
    availabilityStatus: e.availabilityStatus ?? "accepting",
    directorySpecialty: e.directorySpecialty ?? "tax",
    introRequestCount: e.introRequestCount ?? expert.clientsServed ?? 0,
    bio:
      expert.bio ??
      `${expert.name} advises discerning principals on ${expert.specialization.toLowerCase()} with institutional rigour and discretion.`,
  };
}

export function matchesDirectoryFilters(
  expert: DirectoryExpert,
  opts: {
    query?: string;
    specialty?: DirectorySpecialty | "all";
    city?: DirectoryCity | "all";
  },
): boolean {
  const q = opts.query?.trim().toLowerCase();
  if (q) {
    const haystack = [
      expert.name,
      expert.profession,
      expert.city,
      expert.specialization,
      expert.tagline,
      ...expert.displayTags,
      ...expert.languages,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (opts.specialty && opts.specialty !== "all" && expert.directorySpecialty !== opts.specialty) {
    return false;
  }

  if (opts.city && opts.city !== "all" && expert.city !== opts.city) {
    return false;
  }

  return true;
}

export function sortDirectoryExperts(experts: DirectoryExpert[], sort: DirectorySort): DirectoryExpert[] {
  const list = [...experts];
  if (sort === "most_requested") {
    return list.sort((a, b) => b.introRequestCount - a.introRequestCount);
  }
  if (sort === "experience") {
    return list.sort((a, b) => b.yearsExperience - a.yearsExperience);
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
