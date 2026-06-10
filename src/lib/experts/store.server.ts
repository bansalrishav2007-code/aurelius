import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { wireChatStore } from "./chat.server";
import {
  notifyBookingCancelled,
  notifyBookingConfirmed,
  notifyBookingDeclined,
  notifyBookingRequestSent,
  notifyExpertNewRequest,
  notifyMeetingEnded,
  notifyMeetingReminder,
  notifySuggestedTime,
} from "./booking-notifications.server";
import { generatePreMeetingBrief } from "./meeting-brief.server";
import { sendBookingConfirmationEmails, sendBookingReminderEmail } from "./notifications.server";
import { wireRelationsStore } from "./relations.server";
import { createDailyRoom } from "./video.server";
import type { BookingDuration, BookingServiceType } from "./service-types";
import type {
  ExpertApplication,
  ExpertAvailability,
  ExpertBooking,
  ExpertCategory,
  ExpertProfile,
  ExpertReview,
  ExpertsStore,
} from "./types";
import { EXPERT_CATEGORY_LABELS } from "./types";
import { calculateBookingPrice, canBookExpert, type MemberTier } from "./pricing";
import { resolveDataFile } from "@/lib/data-path.server";
import { mutateStore as mutateAuthStore, readStore as readAuthStore } from "@/lib/auth/store.server";
import { hashPassword } from "@/lib/auth/password.server";
import { recordPayment, capturePaymentByOrder } from "@/lib/payments/store.server";
import { getRazorpayConfig } from "@/lib/payments/razorpay.server";

let dataPathPromise: Promise<string> | null = null;
async function getDataPath() {
  dataPathPromise ??= resolveDataFile("aurelius-experts.json");
  return dataPathPromise;
}

let memoryStore: ExpertsStore | null = null;

function defaultAvailability(): ExpertAvailability {
  const weekdays = [1, 2, 3, 4, 5] as const;
  return {
    timezone: "Asia/Kolkata",
    weeklyHours: weekdays.map((day) => ({
      day,
      slots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    })),
    blockedDates: [],
  };
}

function seedReviews(): ExpertReview[] {
  return [
    {
      id: "rev-1",
      rating: 5,
      comment: "Exceptional clarity on my tax position. Felt like speaking to a trusted family CA.",
      date: "2025-11-12",
    },
    {
      id: "rev-2",
      rating: 5,
      comment: "Structured my succession plan with precision. Highly recommend for HNI families.",
      date: "2025-09-03",
    },
    {
      id: "rev-3",
      rating: 4,
      comment: "Sharp, direct advice on portfolio rebalancing. No generic fluff.",
      date: "2025-07-21",
    },
  ];
}

function seedExperts(): ExpertProfile[] {
  const now = new Date().toISOString();
  const reviews = seedReviews();
  const base = (partial: Omit<ExpertProfile, "createdAt" | "updatedAt" | "availability" | "status">): ExpertProfile => ({
    ...partial,
    status: "active",
    availability: defaultAvailability(),
    expertiseAreas: partial.expertiseAreas ?? [partial.specialization],
    reviews: partial.reviews ?? reviews,
    videoEnabled: true,
    documentSharingEnabled: true,
    createdAt: now,
    updatedAt: now,
  });

  return [
    base({
      id: "exp-arjun-malhotra",
      name: "Arjun Malhotra",
      category: "financial-advisor",
      profession: "SEBI Registered Investment Advisor",
      yearsExperience: 14,
      specialization: "Portfolio Strategy & Asset Allocation",
      languages: ["English", "Hindi"],
      rating: 4.9,
      clientsServed: 312,
      pricePaise: 399_900,
      exclusiveOnly: false,
      portalEmail: "arjun.malhotra@experts.aurelius.ai",
      city: "Mumbai",
      verified: true,
      directorySpecialty: "investments",
      displayTags: ["SEBI RIA", "Tax Planning", "Portfolio Strategy"],
      tagline: "Institutional-grade portfolio design for founders and family principals.",
      credentials: ["SEBI RIA (INA000012345)", "CFA Charterholder", "NISM Series-X-A"],
      notableClientTypes: ["Founders", "Family Offices", "CXOs"],
      availabilityStatus: "accepting",
      introRequestCount: 186,
      bio: "Arjun advises HNI families on long-horizon asset allocation, direct equity sleeves, and tax-efficient rebalancing. Former head of private wealth at a leading AMC.",
      expertiseAreas: ["Asset allocation", "Direct equity", "Mutual fund selection", "Risk budgeting"],
    }),
    base({
      id: "exp-rahul-sharma",
      name: "Rahul Sharma",
      category: "chartered-accountant",
      profession: "Chartered Accountant",
      yearsExperience: 12,
      specialization: "Tax & Compliance",
      languages: ["English", "Hindi"],
      rating: 4.9,
      clientsServed: 340,
      pricePaise: 249_900,
      exclusiveOnly: false,
      portalEmail: "rahul.sharma@experts.aurelius.ai",
      city: "Mumbai",
      verified: true,
      directorySpecialty: "tax",
      displayTags: ["Tax Planning", "ITR", "GST", "Compliance"],
      tagline: "Precision tax structuring for founders, promoters, and family businesses.",
      credentials: ["FCA", "DISA", "Former Big Four Tax Partner"],
      notableClientTypes: ["Founders", "Promoter families", "SME groups"],
      availabilityStatus: "accepting",
      introRequestCount: 224,
      bio: "Rahul specialises in founder taxation, ESOP structuring, advance tax planning, and cross-border compliance for Indian principals with complex income streams.",
      expertiseAreas: ["Personal tax", "Corporate tax", "ESOP", "Transfer pricing reviews"],
    }),
    base({
      id: "exp-sanjay-kapoor",
      name: "Sanjay Kapoor",
      category: "estate-planning-lawyer",
      profession: "Estate & Succession Lawyer",
      yearsExperience: 18,
      specialization: "Trusts, Wills & Succession",
      languages: ["English", "Hindi"],
      rating: 5.0,
      clientsServed: 95,
      pricePaise: 599_900,
      exclusiveOnly: true,
      portalEmail: "sanjay.kapoor@experts.aurelius.ai",
      city: "Delhi",
      verified: true,
      directorySpecialty: "legal",
      displayTags: ["Estate Law", "Succession", "Family Trusts"],
      tagline: "Discreet succession architecture for multi-generational wealth.",
      credentials: ["LLB (Delhi University)", "Society of Trust and Estate Practitioners"],
      notableClientTypes: ["Family Offices", "UHNIs", "Business families"],
      availabilityStatus: "waitlist",
      introRequestCount: 142,
      bio: "Sanjay structures wills, private trusts, and family constitutions for business families navigating inter-generational transfer. Counsel to several listed-group promoter families.",
      expertiseAreas: ["Private trusts", "Wills", "Family constitution", "Probate"],
    }),
    base({
      id: "exp-kavita-reddy",
      name: "Kavita Reddy",
      category: "financial-advisor",
      profession: "Family Office Consultant",
      yearsExperience: 16,
      specialization: "Family Office Design & Governance",
      languages: ["English", "Telugu", "Hindi"],
      rating: 4.8,
      clientsServed: 78,
      pricePaise: 549_900,
      exclusiveOnly: true,
      portalEmail: "kavita.reddy@experts.aurelius.ai",
      city: "Bangalore",
      verified: true,
      directorySpecialty: "family-office",
      displayTags: ["Family Office", "Governance", "Wealth Preservation"],
      tagline: "Builds operating models for single-family offices and principal offices.",
      credentials: ["MBA (ISB)", "Family Office Exchange Fellow"],
      notableClientTypes: ["Family Offices", "Tech founders", "Multi-gen families"],
      availabilityStatus: "accepting",
      introRequestCount: 98,
      bio: "Kavita helps principals stand up family offices — investment policy, governance charters, concierge ops, and advisor orchestration across tax, legal, and investments.",
      expertiseAreas: ["FO setup", "IPS design", "Governance", "Advisor management"],
    }),
    base({
      id: "exp-neha-saxena",
      name: "Neha Saxena",
      category: "financial-advisor",
      profession: "Insurance Specialist",
      yearsExperience: 10,
      specialization: "HNI Life & Health Cover",
      languages: ["English", "Hindi", "Telugu"],
      rating: 4.7,
      clientsServed: 210,
      pricePaise: 199_900,
      exclusiveOnly: false,
      portalEmail: "neha.saxena@experts.aurelius.ai",
      city: "Hyderabad",
      verified: true,
      directorySpecialty: "insurance",
      displayTags: ["Insurance", "ULIP review", "Estate liquidity"],
      tagline: "High-sum-assured cover and legacy liquidity for principals.",
      credentials: ["IRDAI Certified Planner", "MDRT Qualifier"],
      notableClientTypes: ["HNIs", "Professionals", "Business owners"],
      availabilityStatus: "accepting",
      introRequestCount: 156,
      bio: "Neha designs life, health, and estate-liquidity cover for HNI clients — independent of product sales bias, focused on adequacy and estate settlement needs.",
      expertiseAreas: ["Term cover", "Health top-up", "Key-man policies", "Legacy planning"],
    }),
    base({
      id: "exp-priya-nair",
      name: "Priya Nair",
      category: "tax-consultant",
      profession: "NRI Wealth Advisor",
      yearsExperience: 9,
      specialization: "NRI Taxation & Repatriation",
      languages: ["English", "Tamil", "Hindi"],
      rating: 4.8,
      clientsServed: 210,
      pricePaise: 299_900,
      exclusiveOnly: false,
      portalEmail: "priya.nair@experts.aurelius.ai",
      city: "Mumbai",
      verified: true,
      directorySpecialty: "nri",
      displayTags: ["NRI Tax", "FEMA", "Repatriation", "DTAA"],
      tagline: "Cross-border wealth compliance for NRIs and returning Indians.",
      credentials: ["ACA", "ADIT (CIOT UK)", "FEMA specialist"],
      notableClientTypes: ["NRIs", "Returning Indians", "Global professionals"],
      availabilityStatus: "accepting",
      introRequestCount: 178,
      bio: "Priya advises NRIs on India asset compliance, remittance, property sale proceeds, and tax residency transitions — coordinating with CAs and counsel globally.",
      expertiseAreas: ["NRI ITR", "FEMA", "DTAA", "Repatriation"],
    }),
  ];
}

function normalizeStore(parsed: ExpertsStore): ExpertsStore {
  parsed.clientRelations ??= [];
  parsed.chatThreads ??= [];
  parsed.applications ??= [];
  parsed.bookings ??= [];
  parsed.introductionRequests ??= [];
  if (!parsed.experts?.length) {
    parsed.experts = seedExperts();
  }
  for (const expert of parsed.experts) {
    expert.reviews ??= seedReviews();
    expert.expertiseAreas ??= [expert.specialization];
    expert.videoEnabled ??= true;
    expert.documentSharingEnabled ??= true;
  }
  for (const booking of parsed.bookings) {
    normalizeBooking(booking);
  }
  return parsed;
}

async function readStore(): Promise<ExpertsStore> {
  if (memoryStore) return structuredClone(memoryStore);
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  try {
    const parsed = normalizeStore(JSON.parse(await readFile(DATA_PATH, "utf-8")) as ExpertsStore);
    memoryStore = parsed;
    return structuredClone(parsed);
  } catch {
    const fresh: ExpertsStore = {
      experts: seedExperts(),
      bookings: [],
      clientRelations: [],
      chatThreads: [],
      applications: [],
    };
    await writeStore(fresh);
    return structuredClone(fresh);
  }
}

wireChatStore({
  read: async () => {
    const s = await readStore();
    return { chatThreads: s.chatThreads };
  },
  mutate: async (fn) => mutateStore((store) => fn(store)),
});

wireRelationsStore({
  read: async () => {
    const s = await readStore();
    return { clientRelations: s.clientRelations, chatThreads: s.chatThreads };
  },
  mutate: async (fn) => mutateStore((store) => fn(store)),
});

async function writeStore(store: ExpertsStore): Promise<void> {
  memoryStore = structuredClone(store);
  const DATA_PATH = await getDataPath();
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

async function mutateStore<T>(fn: (store: ExpertsStore) => T | Promise<T>): Promise<T> {
  const store = await readStore();
  const result = await fn(store);
  await writeStore(store);
  return result;
}

export async function listActiveExperts(category?: ExpertCategory): Promise<ExpertProfile[]> {
  const store = await readStore();
  return store.experts.filter((e) => {
    if (e.status !== "active") return false;
    if (category && e.category !== category) return false;
    return true;
  });
}

export async function getExpertById(expertId: string): Promise<ExpertProfile | null> {
  const store = await readStore();
  return store.experts.find((e) => e.id === expertId) ?? null;
}

export async function createIntroductionRequest(opts: {
  expertId: string;
  memberEmail: string;
  memberName: string;
  message: string;
  contactMethod: "email" | "call" | "video";
}): Promise<import("./types").ExpertIntroductionRequest | null> {
  return mutateStore(async (store) => {
    const expert = store.experts.find((e) => e.id === opts.expertId && e.status === "active");
    if (!expert) return null;

    const request: import("./types").ExpertIntroductionRequest = {
      id: `intro-${crypto.randomUUID()}`,
      expertId: opts.expertId,
      memberEmail: opts.memberEmail.toLowerCase(),
      memberName: opts.memberName,
      message: opts.message.trim(),
      contactMethod: opts.contactMethod,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    store.introductionRequests ??= [];
    store.introductionRequests.unshift(request);
    expert.introRequestCount = (expert.introRequestCount ?? 0) + 1;
    expert.updatedAt = new Date().toISOString();
    return request;
  });
}

export async function getExpertByPortalEmail(email: string): Promise<ExpertProfile | null> {
  const store = await readStore();
  const normalized = email.toLowerCase();
  return store.experts.find((e) => e.portalEmail.toLowerCase() === normalized) ?? null;
}

export function getSlotDateTime(date: string, slot: string): string {
  return new Date(`${date}T${slot}:00+05:30`).toISOString();
}

const BUFFER_MINUTES = 15;

function bookingEndTime(b: ExpertBooking): number {
  return new Date(b.scheduledAt).getTime() + b.durationMinutes * 60_000 + BUFFER_MINUTES * 60_000;
}

function bookingStartTime(b: ExpertBooking): number {
  return new Date(b.scheduledAt).getTime() - BUFFER_MINUTES * 60_000;
}

function slotConflicts(
  store: ExpertsStore,
  expertId: string,
  scheduledAt: string,
  durationMinutes: number,
  excludeBookingId?: string,
): boolean {
  const start = new Date(scheduledAt).getTime() - BUFFER_MINUTES * 60_000;
  const end = new Date(scheduledAt).getTime() + durationMinutes * 60_000 + BUFFER_MINUTES * 60_000;

  return store.bookings.some((b) => {
    if (b.expertId !== expertId) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (["cancelled", "rejected"].includes(b.status)) return false;
    const bStart = bookingStartTime(b);
    const bEnd = bookingEndTime(b);
    return start < bEnd && end > bStart;
  });
}

function isSlotBooked(store: ExpertsStore, expertId: string, scheduledAt: string): boolean {
  return slotConflicts(store, expertId, scheduledAt, 60);
}

function generateExpertJoinCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

function normalizeBooking(b: ExpertBooking): ExpertBooking {
  b.serviceType ??= "general_consultation";
  b.durationMinutes ??= 60;
  return b;
}

export async function getCalendarSlots(
  expertId: string,
  durationMinutes: BookingDuration = 60,
  days = 21,
): Promise<{ date: string; slots: import("./types").CalendarSlot[] }[]> {
  const store = await readStore();
  const expert = store.experts.find((e) => e.id === expertId);
  if (!expert || expert.status !== "active") return [];

  const byDate = new Map<string, import("./types").CalendarSlot[]>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 0; d < days; d++) {
    const day = new Date(today);
    day.setDate(day.getDate() + d);
    const dateStr = day.toISOString().slice(0, 10);
    const weekday = day.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const dayHours = expert.availability.weeklyHours.find((w) => w.day === weekday);
    const blocked = expert.availability.blockedDates.includes(dateStr);

    if (!dayHours && !blocked) continue;

    const slots: import("./types").CalendarSlot[] = [];
    const hourSlots = dayHours?.slots ?? [];

    for (const slot of hourSlots) {
      const iso = getSlotDateTime(dateStr, slot);
      const past = new Date(iso).getTime() <= Date.now();
      let status: import("./types").SlotAvailability = "available";
      if (blocked || past) status = past ? "unavailable" : "unavailable";
      else if (slotConflicts(store, expertId, iso, durationMinutes)) status = "booked";
      slots.push({ slot, iso, status });
    }

    if (blocked && slots.length === 0) {
      slots.push({ slot: "—", iso: `${dateStr}T00:00:00+05:30`, status: "unavailable" });
    }

    if (slots.length) byDate.set(dateStr, slots);
  }

  return [...byDate.entries()].map(([date, slots]) => ({ date, slots }));
}

export async function getAvailableSlots(
  expertId: string,
  days = 14,
  durationMinutes: BookingDuration = 60,
): Promise<{ date: string; slot: string; iso: string }[]> {
  const calendar = await getCalendarSlots(expertId, durationMinutes, days);
  const results: { date: string; slot: string; iso: string }[] = [];
  for (const day of calendar) {
    for (const s of day.slots) {
      if (s.status === "available") results.push({ date: day.date, slot: s.slot, iso: s.iso });
    }
  }
  return results;
}

async function ensureExpertPortalAccount(
  email: string,
  fullName: string,
  password: string,
): Promise<void> {
  const normalized = email.toLowerCase();
  await mutateAuthStore((auth) => {
    const existing = auth.members.find((m) => m.email === normalized);
    if (existing) {
      existing.role = "EXPERT";
      existing.fullName = fullName;
      existing.passwordHash = hashPassword(password);
      return;
    }
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 2);
    auth.members.push({
      id: `mem-${crypto.randomUUID()}`,
      email: normalized,
      fullName,
      tier: "principal",
      role: "EXPERT",
      inviteCodeId: "expert-portal",
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      passwordHash: hashPassword(password),
      subscription: "none",
    });
  });
}

export async function createExpert(input: {
  name: string;
  category: ExpertCategory;
  yearsExperience: number;
  specialization: string;
  languages: string[];
  rating?: number;
  clientsServed?: number;
  pricePaise: number;
  exclusiveOnly?: boolean;
  portalEmail: string;
  portalPassword: string;
  bio?: string;
  photoUrl?: string;
  availability?: ExpertAvailability;
}): Promise<ExpertProfile> {
  const portalEmail = input.portalEmail.trim().toLowerCase();
  if (!portalEmail.includes("@")) throw new Error("Valid portal email required.");

  await ensureExpertPortalAccount(portalEmail, input.name.trim(), input.portalPassword);

  return mutateStore((store) => {
    const expert: ExpertProfile = {
      id: `exp-${crypto.randomUUID()}`,
      name: input.name.trim(),
      photoUrl: input.photoUrl,
      category: input.category,
      profession: EXPERT_CATEGORY_LABELS[input.category],
      yearsExperience: input.yearsExperience,
      specialization: input.specialization.trim(),
      languages: input.languages,
      rating: input.rating ?? 4.5,
      clientsServed: input.clientsServed ?? 0,
      pricePaise: input.pricePaise,
      exclusiveOnly: input.exclusiveOnly ?? false,
      portalEmail,
      status: "active",
      availability: input.availability ?? defaultAvailability(),
      bio: input.bio,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.experts.unshift(expert);
    return expert;
  });
}

export async function updateExpert(
  expertId: string,
  updates: Partial<
    Pick<
      ExpertProfile,
      | "name"
      | "photoUrl"
      | "category"
      | "yearsExperience"
      | "specialization"
      | "languages"
      | "rating"
      | "clientsServed"
      | "pricePaise"
      | "exclusiveOnly"
      | "status"
      | "availability"
      | "bio"
      | "portalEmail"
    >
  > & { portalPassword?: string },
): Promise<ExpertProfile | null> {
  if (updates.portalEmail || updates.portalPassword) {
    const expert = await getExpertById(expertId);
    if (!expert) return null;
    const email = (updates.portalEmail ?? expert.portalEmail).toLowerCase();
    if (updates.portalPassword) {
      await ensureExpertPortalAccount(email, updates.name ?? expert.name, updates.portalPassword);
    }
  }

  return mutateStore((store) => {
    const expert = store.experts.find((e) => e.id === expertId);
    if (!expert) return null;
    if (updates.name) expert.name = updates.name.trim();
    if (updates.photoUrl !== undefined) expert.photoUrl = updates.photoUrl;
    if (updates.category) {
      expert.category = updates.category;
      expert.profession = EXPERT_CATEGORY_LABELS[updates.category];
    }
    if (updates.yearsExperience !== undefined) expert.yearsExperience = updates.yearsExperience;
    if (updates.specialization) expert.specialization = updates.specialization.trim();
    if (updates.languages) expert.languages = updates.languages;
    if (updates.rating !== undefined) expert.rating = updates.rating;
    if (updates.clientsServed !== undefined) expert.clientsServed = updates.clientsServed;
    if (updates.pricePaise !== undefined) expert.pricePaise = updates.pricePaise;
    if (updates.exclusiveOnly !== undefined) expert.exclusiveOnly = updates.exclusiveOnly;
    if (updates.status) expert.status = updates.status;
    if (updates.availability) expert.availability = updates.availability;
    if (updates.bio !== undefined) expert.bio = updates.bio;
    if (updates.portalEmail) expert.portalEmail = updates.portalEmail.toLowerCase();
    expert.updatedAt = new Date().toISOString();
    return { ...expert };
  });
}

export async function deleteExpert(expertId: string): Promise<boolean> {
  return mutateStore((store) => {
    const idx = store.experts.findIndex((e) => e.id === expertId);
    if (idx === -1) return false;
    store.experts[idx]!.status = "inactive";
    store.experts[idx]!.updatedAt = new Date().toISOString();
    return true;
  });
}

export async function getExpertAvailabilityFlags(expertId: string) {
  const slots = await getAvailableSlots(expertId, 14);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const availableNow = slots.some((s) => new Date(s.iso).getTime() - now < dayMs);
  const availableThisWeek = slots.length > 0;
  return { availableNow, availableThisWeek, nextSlot: slots[0] ?? null };
}

export async function submitExpertApplication(
  input: Omit<ExpertApplication, "id" | "status" | "createdAt">,
): Promise<ExpertApplication> {
  return mutateStore((store) => {
    const app: ExpertApplication = {
      ...input,
      id: `expapp-${crypto.randomUUID()}`,
      email: input.email.toLowerCase(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    store.applications.unshift(app);
    return app;
  });
}

export async function signExpertNda(portalEmail: string): Promise<boolean> {
  return mutateStore((store) => {
    const expert = store.experts.find((e) => e.portalEmail.toLowerCase() === portalEmail.toLowerCase());
    if (!expert) return false;
    expert.ndaSignedAt = new Date().toISOString();
    expert.updatedAt = expert.ndaSignedAt;
    return true;
  });
}

async function maybeSendReminders(store: ExpertsStore): Promise<void> {
  const now = Date.now();
  const window30 = 30 * 60 * 1000;
  const window10 = 10 * 60 * 1000;

  for (const booking of store.bookings) {
    if (booking.status !== "confirmed") continue;
    const expert = store.experts.find((e) => e.id === booking.expertId);
    if (!expert) continue;
    const delta = new Date(booking.scheduledAt).getTime() - now;

    if (!booking.aiBriefGeneratedAt && delta > 0 && delta <= window30) {
      try {
        booking.aiBrief = await generatePreMeetingBrief(booking, expert);
        booking.aiBriefGeneratedAt = new Date().toISOString();
      } catch {
        /* non-fatal */
      }
    }

    if (!booking.reminderSentAt && delta > 0 && delta <= window30) {
      await sendBookingReminderEmail(booking, expert, "member");
      await sendBookingReminderEmail(booking, expert, "expert");
      await notifyMeetingReminder(booking, expert, 30);
      booking.reminderSentAt = new Date().toISOString();
    }

    if (!booking.reminder10SentAt && delta > 0 && delta <= window10) {
      await notifyMeetingReminder(booking, expert, 10);
      booking.reminder10SentAt = new Date().toISOString();
    }
  }
}

export async function createBooking(input: {
  expertId: string;
  memberEmail: string;
  memberName: string;
  memberTier: MemberTier;
  scheduledAt: string;
  durationMinutes?: BookingDuration;
  serviceType?: BookingServiceType;
  notes?: string;
  agenda?: string;
  vaultBriefApproved?: boolean;
}): Promise<{ ok: true; booking: ExpertBooking } | { ok: false; error: string }> {
  const duration = input.durationMinutes ?? 60;
  const agenda = (input.agenda?.trim() || input.notes?.trim() || "").slice(0, 500);

  return mutateStore((store) => {
    const expert = store.experts.find((e) => e.id === input.expertId);
    if (!expert) return { ok: false as const, error: "Expert not found." };
    if (!canBookExpert(expert, input.memberTier)) {
      return { ok: false as const, error: "This expert is exclusive to premium members." };
    }
    if (slotConflicts(store, input.expertId, input.scheduledAt, duration)) {
      return { ok: false as const, error: "This time slot is no longer available." };
    }

    const pricing = calculateBookingPrice(expert, input.memberTier);
    const booking: ExpertBooking = {
      id: `bk-${crypto.randomUUID()}`,
      expertId: input.expertId,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      memberTier: input.memberTier,
      scheduledAt: input.scheduledAt,
      durationMinutes: duration,
      serviceType: input.serviceType ?? "general_consultation",
      amountPaise: pricing.amountPaise,
      discountPaise: pricing.discountPaise,
      finalAmountPaise: pricing.finalAmountPaise,
      status: "pending_payment",
      paymentStatus: "pending",
      priorityBooking: pricing.priorityBooking,
      notes: input.notes?.trim(),
      agenda,
      vaultBriefApproved: input.vaultBriefApproved ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.bookings.unshift(booking);
    return { ok: true as const, booking };
  });
}

export async function createBookingPaymentOrder(bookingId: string, memberEmail: string) {
  const store = await readStore();
  const booking = store.bookings.find((b) => b.id === bookingId && b.memberEmail === memberEmail.toLowerCase());
  if (!booking) return { ok: false as const, error: "Booking not found." };
  if (booking.status !== "pending_payment") return { ok: false as const, error: "Booking is not awaiting payment." };

  const expert = store.experts.find((e) => e.id === booking.expertId);
  const config = getRazorpayConfig();

  let orderId: string;
  if (!config.enabled) {
    orderId = `order_dev_${crypto.randomUUID().slice(0, 8)}`;
  } else {
    const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: booking.finalAmountPaise,
        currency: "INR",
        receipt: `aurelius_booking_${booking.id}`,
        notes: { bookingId: booking.id, expertId: booking.expertId, email: memberEmail },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false as const, error: `Payment error: ${text || res.statusText}` };
    }
    const data = (await res.json()) as { id: string };
    orderId = data.id;
  }

  await mutateStore((s) => {
    const b = s.bookings.find((x) => x.id === bookingId);
    if (b) b.paymentOrderId = orderId;
  });

  await recordPayment({
    memberEmail,
    memberName: booking.memberName,
    planId: `expert-booking-${booking.id}`,
    planName: `Consultation · ${expert?.name ?? "Expert"}`,
    amountPaise: booking.finalAmountPaise,
    currency: "INR",
    orderId,
    status: "pending",
  });

  return {
    ok: true as const,
    orderId,
    amount: booking.finalAmountPaise,
    currency: "INR",
    keyId: config.enabled ? config.keyId : "rzp_test_dev",
    bookingId: booking.id,
  };
}

export async function confirmBookingPayment(bookingId: string, memberEmail: string, orderId?: string) {
  const store = await readStore();
  const booking = store.bookings.find((b) => b.id === bookingId && b.memberEmail === memberEmail.toLowerCase());
  if (!booking) return { ok: false as const, error: "Booking not found." };

  const resolvedOrderId = orderId ?? booking.paymentOrderId;
  if (!resolvedOrderId) return { ok: false as const, error: "No payment order for this booking." };

  await capturePaymentByOrder(resolvedOrderId, memberEmail);

  const updated = await mutateStore((s) => {
    const b = s.bookings.find((x) => x.id === bookingId);
    if (!b) return null;
    b.paymentStatus = "captured";
    b.status = "pending_expert";
    b.updatedAt = new Date().toISOString();
    return { ...b };
  });

  if (!updated) return { ok: false as const, error: "Booking update failed." };

  const expert = (await readStore()).experts.find((e) => e.id === updated.expertId);
  if (expert) {
    await sendBookingConfirmationEmails(updated, expert);
    await notifyBookingRequestSent(updated, expert);
    await notifyExpertNewRequest(updated, expert);
    await mutateStore((s) => {
      const b = s.bookings.find((x) => x.id === bookingId);
      if (b) b.confirmationSentAt = new Date().toISOString();
    });
  }

  return { ok: true as const, booking: updated };
}

export async function listMemberBookings(memberEmail: string): Promise<ExpertBooking[]> {
  const store = await readStore();
  await maybeSendReminders(store);
  await writeStore(store);
  return store.bookings.filter((b) => b.memberEmail === memberEmail.toLowerCase());
}

export async function listExpertBookings(portalEmail: string): Promise<(ExpertBooking & { expertName: string })[]> {
  const store = await readStore();
  const expert = store.experts.find((e) => e.portalEmail.toLowerCase() === portalEmail.toLowerCase());
  if (!expert) return [];
  return store.bookings
    .filter((b) => b.expertId === expert.id)
    .map((b) => ({ ...b, expertName: expert.name }));
}

export async function listAllBookings(): Promise<(ExpertBooking & { expertName: string; memberLabel: string })[]> {
  const store = await readStore();
  return store.bookings.map((b) => {
    const expert = store.experts.find((e) => e.id === b.expertId);
    return { ...b, expertName: expert?.name ?? "Unknown", memberLabel: b.memberName };
  });
}

export async function updateBookingStatus(
  bookingId: string,
  portalEmail: string,
  status: "confirmed" | "rejected" | "completed",
  opts?: { expertNotes?: string; declineReason?: string; suggestedTime?: string },
): Promise<ExpertBooking | null> {
  const result = await mutateStore((store) => {
    const expert = store.experts.find((e) => e.portalEmail.toLowerCase() === portalEmail.toLowerCase());
    if (!expert) return null;
    const booking = store.bookings.find((b) => b.id === bookingId && b.expertId === expert.id);
    if (!booking) return null;

    if (status === "confirmed" && booking.status === "pending_expert") {
      booking.status = "confirmed";
      booking.expertJoinCode = generateExpertJoinCode();
      const endMs = new Date(booking.scheduledAt).getTime() + booking.durationMinutes * 60_000 + 60 * 60_000;
      void createDailyRoom(booking.id, endMs).then(async (room) => {
        await mutateStore((s) => {
          const b = s.bookings.find((x) => x.id === bookingId);
          if (b) {
            b.meetingUrl = room.url;
            b.dailyRoomName = room.roomName;
          }
        });
      });
    } else if (status === "rejected" && ["pending_expert", "confirmed"].includes(booking.status)) {
      booking.status = "rejected";
      if (opts?.declineReason) booking.declineReason = opts.declineReason;
      if (opts?.suggestedTime) booking.suggestedTime = opts.suggestedTime;
    } else if (status === "completed" && booking.status === "confirmed") {
      booking.status = "completed";
      expert.clientsServed += 1;
    } else {
      return null;
    }

    if (opts?.expertNotes) booking.expertNotes = opts.expertNotes;
    booking.updatedAt = new Date().toISOString();
    return { booking: { ...booking }, expert: { ...expert } };
  });

  if (!result) return null;
  const { booking, expert } = result;

  if (status === "confirmed") await notifyBookingConfirmed(booking, expert);
  if (status === "rejected") {
    await notifyBookingDeclined(booking, expert);
    if (booking.suggestedTime) await notifySuggestedTime(booking, expert);
  }
  if (status === "completed") await notifyMeetingEnded(booking, expert);

  return booking;
}

export async function suggestBookingTime(
  bookingId: string,
  portalEmail: string,
  suggestedTime: string,
  declineReason?: string,
): Promise<ExpertBooking | null> {
  const result = await mutateStore((store) => {
    const expert = store.experts.find((e) => e.portalEmail.toLowerCase() === portalEmail.toLowerCase());
    if (!expert) return null;
    const booking = store.bookings.find((b) => b.id === bookingId && b.expertId === expert.id);
    if (!booking || !["pending_expert", "confirmed"].includes(booking.status)) return null;
    if (slotConflicts(store, expert.id, suggestedTime, booking.durationMinutes, booking.id)) return null;
    booking.suggestedTime = suggestedTime;
    if (declineReason) {
      booking.declineReason = declineReason;
      booking.status = "rejected";
    }
    booking.updatedAt = new Date().toISOString();
    return { booking: { ...booking }, expert: { ...expert } };
  });
  if (!result) return null;
  await notifySuggestedTime(result.booking, result.expert);
  return result.booking;
}

export async function cancelMemberBooking(bookingId: string, memberEmail: string): Promise<ExpertBooking | null> {
  const result = await mutateStore((store) => {
    const booking = store.bookings.find(
      (b) => b.id === bookingId && b.memberEmail === memberEmail.toLowerCase(),
    );
    if (!booking || !["pending_payment", "pending_expert", "confirmed"].includes(booking.status)) return null;
    booking.status = "cancelled";
    booking.updatedAt = new Date().toISOString();
    const expert = store.experts.find((e) => e.id === booking.expertId);
    return expert ? { booking: { ...booking }, expert: { ...expert } } : null;
  });
  if (!result) return null;
  await notifyBookingCancelled(result.booking, result.expert, "member");
  return result.booking;
}

export async function acceptSuggestedTime(bookingId: string, memberEmail: string): Promise<ExpertBooking | null> {
  return mutateStore((store) => {
    const booking = store.bookings.find(
      (b) => b.id === bookingId && b.memberEmail === memberEmail.toLowerCase(),
    );
    if (!booking?.suggestedTime || booking.status !== "rejected") return null;
    if (slotConflicts(store, booking.expertId, booking.suggestedTime, booking.durationMinutes, booking.id)) {
      return null;
    }
    booking.scheduledAt = booking.suggestedTime;
    booking.suggestedTime = undefined;
    booking.declineReason = undefined;
    booking.status = "pending_expert";
    booking.updatedAt = new Date().toISOString();
    return { ...booking };
  });
}

export async function rateBooking(
  bookingId: string,
  memberEmail: string,
  rating: number,
  review?: string,
): Promise<ExpertBooking | null> {
  return mutateStore((store) => {
    const booking = store.bookings.find(
      (b) => b.id === bookingId && b.memberEmail === memberEmail.toLowerCase(),
    );
    if (!booking || booking.status !== "completed") return null;
    booking.memberRating = Math.min(5, Math.max(1, Math.round(rating)));
    if (review?.trim()) booking.memberReview = review.trim().slice(0, 1000);
    booking.updatedAt = new Date().toISOString();

    const expert = store.experts.find((e) => e.id === booking.expertId);
    if (expert && booking.memberReview) {
      expert.reviews ??= [];
      expert.reviews.unshift({
        id: `rev-${crypto.randomUUID()}`,
        rating: booking.memberRating,
        comment: booking.memberReview,
        date: new Date().toISOString().slice(0, 10),
      });
      const ratings = expert.reviews.map((r) => r.rating);
      expert.rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }
    return { ...booking };
  });
}

export async function getBookingClientBrief(bookingId: string, portalEmail: string): Promise<string | null> {
  const store = await readStore();
  const expert = store.experts.find((e) => e.portalEmail.toLowerCase() === portalEmail.toLowerCase());
  if (!expert) return null;
  const booking = store.bookings.find((b) => b.id === bookingId && b.expertId === expert.id);
  if (!booking) return null;
  if (booking.aiBrief) return booking.aiBrief;
  const { buildClientWealthBriefForExpert } = await import("./brief.server");
  return buildClientWealthBriefForExpert(booking.memberEmail);
}

export async function adminUpdateBooking(
  bookingId: string,
  action: "confirm" | "reject" | "cancel" | "complete",
  opts?: { suggestedTime?: string; declineReason?: string },
): Promise<ExpertBooking | null> {
  const result = await mutateStore((store) => {
    const booking = store.bookings.find((b) => b.id === bookingId);
    if (!booking) return null;
    const expert = store.experts.find((e) => e.id === booking.expertId);
    if (!expert) return null;

    if (action === "confirm" && ["pending_expert", "pending_payment"].includes(booking.status)) {
      booking.status = "confirmed";
      booking.paymentStatus = "captured";
      booking.expertJoinCode = generateExpertJoinCode();
    } else if (action === "reject") {
      booking.status = "rejected";
      if (opts?.declineReason) booking.declineReason = opts.declineReason;
      if (opts?.suggestedTime) booking.suggestedTime = opts.suggestedTime;
    } else if (action === "cancel") {
      booking.status = "cancelled";
    } else if (action === "complete" && booking.status === "confirmed") {
      booking.status = "completed";
      expert.clientsServed += 1;
    } else {
      return null;
    }
    booking.updatedAt = new Date().toISOString();
    return { booking: { ...booking }, expert: { ...expert } };
  });
  if (!result) return null;
  if (action === "cancel") await notifyBookingCancelled(result.booking, result.expert, "admin");
  return result.booking;
}

export async function getBookingStats() {
  const store = await readStore();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthBookings = store.bookings.filter((b) => b.createdAt >= monthStart);
  const revenuePaise = monthBookings
    .filter((b) => b.paymentStatus === "captured")
    .reduce((s, b) => s + b.finalAmountPaise, 0);

  return {
    monthTotal: monthBookings.length,
    pending: store.bookings.filter((b) => b.status === "pending_expert").length,
    confirmed: store.bookings.filter((b) => b.status === "confirmed").length,
    completed: store.bookings.filter((b) => b.status === "completed").length,
    cancelled: store.bookings.filter((b) => b.status === "cancelled").length,
    revenuePaise,
  };
}

export async function updateExpertAvailability(
  portalEmail: string,
  availability: ExpertAvailability,
): Promise<ExpertProfile | null> {
  return mutateStore((store) => {
    const expert = store.experts.find((e) => e.portalEmail.toLowerCase() === portalEmail.toLowerCase());
    if (!expert) return null;
    expert.availability = availability;
    expert.updatedAt = new Date().toISOString();
    return { ...expert };
  });
}

export async function getExpertRevenueSummary() {
  const store = await readStore();
  const captured = store.bookings.filter((b) => b.paymentStatus === "captured");
  const totalRevenuePaise = captured.reduce((sum, b) => sum + b.finalAmountPaise, 0);
  const completed = store.bookings.filter((b) => b.status === "completed").length;
  const pending = store.bookings.filter((b) => ["pending_payment", "pending_expert"].includes(b.status)).length;
  return {
    totalRevenuePaise,
    totalBookings: store.bookings.length,
    completedConsultations: completed,
    pendingBookings: pending,
    activeExperts: store.experts.filter((e) => e.status === "active").length,
  };
}

export async function listAllExperts(): Promise<ExpertProfile[]> {
  const store = await readStore();
  return store.experts;
}

/** Seed expert portal passwords on first run (dev only). */
export async function ensureExpertPortalSeeds(): Promise<void> {
  const experts = await listAllExperts();
  const auth = await readAuthStore();
  for (const expert of experts) {
    const exists = auth.members.some((m) => m.email === expert.portalEmail.toLowerCase());
    if (!exists) {
      await ensureExpertPortalAccount(expert.portalEmail, expert.name, "Expert2026!");
    }
  }
}
