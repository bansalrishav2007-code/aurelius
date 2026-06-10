export type ExpertCategory =
  | "chartered-accountant"
  | "tax-consultant"
  | "corporate-lawyer"
  | "startup-lawyer"
  | "estate-planning-lawyer"
  | "financial-advisor";

export type ExpertStatus = "active" | "inactive";

export type ExpertAvailability = {
  timezone: string;
  /** Hour slots per weekday, e.g. ["09:00","10:00","11:00"] */
  weeklyHours: { day: 0 | 1 | 2 | 3 | 4 | 5 | 6; slots: string[] }[];
  blockedDates: string[];
};

export type ExpertReview = {
  id: string;
  rating: number;
  comment: string;
  date: string;
};

export type ExpertIntroductionRequest = {
  id: string;
  expertId: string;
  memberEmail: string;
  memberName: string;
  message: string;
  contactMethod: "email" | "call" | "video";
  status: "pending" | "facilitated";
  createdAt: string;
};

export type ExpertProfile = {
  id: string;
  name: string;
  photoUrl?: string;
  category: ExpertCategory;
  profession: string;
  yearsExperience: number;
  specialization: string;
  languages: string[];
  rating: number;
  clientsServed: number;
  pricePaise: number;
  exclusiveOnly: boolean;
  portalEmail: string;
  status: ExpertStatus;
  availability: ExpertAvailability;
  bio?: string;
  expertiseAreas?: string[];
  reviews?: ExpertReview[];
  createdAt: string;
  updatedAt: string;
  videoEnabled?: boolean;
  documentSharingEnabled?: boolean;
  ndaSignedAt?: string;
  city?: import("./directory").DirectoryCity;
  verified?: boolean;
  displayTags?: string[];
  tagline?: string;
  credentials?: string[];
  notableClientTypes?: string[];
  availabilityStatus?: "accepting" | "waitlist";
  directorySpecialty?: import("./directory").DirectorySpecialty;
  introRequestCount?: number;
};

import type { BookingServiceType } from "./service-types";

export type BookingStatus =
  | "pending_payment"
  | "pending_expert"
  | "confirmed"
  | "rejected"
  | "completed"
  | "cancelled";

export type SlotAvailability = "available" | "booked" | "unavailable";

export type CalendarSlot = {
  slot: string;
  iso: string;
  status: SlotAvailability;
};

export type ExpertBooking = {
  id: string;
  expertId: string;
  memberEmail: string;
  memberName: string;
  memberTier: string;
  scheduledAt: string;
  durationMinutes: number;
  serviceType: BookingServiceType;
  amountPaise: number;
  discountPaise: number;
  finalAmountPaise: number;
  status: BookingStatus;
  paymentOrderId?: string;
  paymentStatus: "pending" | "captured" | "failed";
  priorityBooking: boolean;
  notes?: string;
  agenda?: string;
  expertNotes?: string;
  sessionNotes?: string;
  declineReason?: string;
  suggestedTime?: string;
  expertJoinCode?: string;
  memberRating?: number;
  memberReview?: string;
  aiBrief?: string;
  aiBriefGeneratedAt?: string;
  vaultBriefApproved?: boolean;
  createdAt: string;
  updatedAt: string;
  meetingUrl?: string;
  dailyRoomName?: string;
  sharedDocumentIds?: string[];
  confirmationSentAt?: string;
  reminderSentAt?: string;
  reminder10SentAt?: string;
  recordingEnabled?: boolean;
};

export type ExpertClientRelation = {
  id: string;
  expertId: string;
  memberEmail: string;
  memberName: string;
  vaultShareApproved: boolean;
  vaultShareApprovedAt?: string;
  mainConcern?: string;
  ndaSignedByExpert: boolean;
  ndaSignedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpertChatMessage = {
  id: string;
  sender: "member" | "expert";
  content: string;
  documentIds?: string[];
  createdAt: string;
};

export type ExpertChatThread = {
  id: string;
  expertId: string;
  memberEmail: string;
  memberName: string;
  messages: ExpertChatMessage[];
  wealthBriefForExpert?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpertApplicationStatus = "pending" | "approved" | "declined";

export type ExpertApplication = {
  id: string;
  fullName: string;
  email: string;
  qualification: string;
  councilNumber: string;
  specialisation: string;
  yearsExperience: number;
  linkedIn?: string;
  credentialsNote?: string;
  status: ExpertApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
};

export type ExpertsStore = {
  experts: ExpertProfile[];
  bookings: ExpertBooking[];
  clientRelations: ExpertClientRelation[];
  chatThreads: ExpertChatThread[];
  applications: ExpertApplication[];
  introductionRequests?: ExpertIntroductionRequest[];
};

export const EXPERT_CATEGORY_LABELS: Record<ExpertCategory, string> = {
  "chartered-accountant": "Chartered Accountant",
  "tax-consultant": "Tax Consultant",
  "corporate-lawyer": "Corporate Lawyer",
  "startup-lawyer": "Startup Lawyer",
  "estate-planning-lawyer": "Estate Planning Lawyer",
  "financial-advisor": "Financial Advisor",
};
