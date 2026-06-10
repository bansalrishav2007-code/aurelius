export type InviteStatus = "active" | "used" | "revoked" | "expired";

export type InviteCode = {
  id: string;
  code: string;
  label?: string;
  tier: "founding" | "principal" | "family-office";
  maxUses: number;
  useCount: number;
  expiresAt: string | null;
  status: InviteStatus;
  createdAt: string;
  createdBy?: string;
  usedBy?: string[];
  notes?: string;
  /** Email this invite was issued to — must match at access/onboarding */
  assignedEmail?: string;
  waitlistId?: string;
};

export type WaitlistStatus = "pending" | "approved" | "declined";

export type MembershipApplicationStatus = "pending" | "approved" | "rejected";

export type MembershipApplication = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  tierApplying: InviteCode["tier"];
  netWorthRange: "1-5cr" | "5-25cr" | "25cr+";
  primaryNeed: "tax" | "wealth" | "legal" | "all";
  hearAbout?: string;
  whyAccess: string;
  status: MembershipApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
  inviteCodeId?: string;
  inviteCode?: string;
  adminNotes?: string;
};

export type UpgradeRequest = {
  id: string;
  memberEmail: string;
  memberName: string;
  currentTier: InviteCode["tier"];
  requestedTier: InviteCode["tier"];
  reason?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
};

export type OnboardingChecklist = {
  profileComplete: boolean;
  vaultSetup: boolean;
  firstAsset: boolean;
  introCallBooked: boolean;
};

export type AdminActivityEntry = {
  id: string;
  action: string;
  detail: string;
  actor?: string;
  createdAt: string;
};

export type WaitlistApplication = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  profession: string;
  wealthNature?: string;
  wealthConcern?: string;
  netWorthBand?: string;
  city?: string;
  hasCA?: "yes" | "no";
  hasLawyer?: "yes" | "no";
  applicationNote?: string;
  hearAbout?: string;
  whyAccess?: string;
  referenceNumber?: string;
  status: WaitlistStatus;
  createdAt: string;
  emailVerifiedAt?: string;
  reviewedAt?: string;
  inviteCodeId?: string;
  inviteCode?: string;
  invitationSentAt?: string;
  adminNotes?: string;
  declineReason?: string;
};

export type SubscriptionStatus = "none" | "active" | "past_due" | "cancelled";

export type MemberRole = "member" | "ADMIN" | "SUPER_ADMIN" | "EXPERT";

export type MemberSession = {
  id: string;
  email: string;
  fullName: string;
  tier: InviteCode["tier"];
  role?: MemberRole;
  inviteCodeId: string;
  createdAt: string;
  expiresAt: string;
  passwordHash?: string;
  subscription?: SubscriptionStatus;
  subscriptionPlan?: string;
  revoked?: boolean;
  resetToken?: string;
  resetTokenExpires?: string;
  onboardingComplete?: boolean;
  onboardingChecklist?: OnboardingChecklist;
  dashboardUnlocked?: boolean;
  suspended?: boolean;
  profession?: string;
  firm?: string;
  /** Demo experience — restricted access with mock data */
  isDemo?: boolean;
  /** Temporary OTP bypass for local feature testing — remove before launch */
  devBypass?: boolean;
  firstName?: string;
  aiQuotaDaily?: number;
  demoPurpose?: string;
};

export type AdminSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
};

export type AuthStore = {
  invites: InviteCode[];
  waitlist: WaitlistApplication[];
  membershipApplications: MembershipApplication[];
  upgradeRequests: UpgradeRequest[];
  adminActivity: AdminActivityEntry[];
  members: MemberSession[];
  admins: AdminSession[];
};

export type PublicSession = {
  email: string;
  fullName: string;
  tier: InviteCode["tier"];
  role?: MemberRole;
  subscription?: SubscriptionStatus;
  onboardingComplete?: boolean;
  dashboardUnlocked?: boolean;
  onboardingChecklist?: OnboardingChecklist;
  isDemo?: boolean;
  devBypass?: boolean;
  firstName?: string;
  profession?: string;
  firm?: string;
  aiQuotaDaily?: number;
  aiQuotaRemaining?: number;
  demoPurpose?: string;
};

export type PublicInvitePreview = {
  valid: boolean;
  tier?: InviteCode["tier"];
  label?: string;
  expiresAt?: string | null;
  assignedEmail?: string;
  error?: string;
};

export type PublicMember = {
  id: string;
  email: string;
  fullName: string;
  tier: InviteCode["tier"];
  role?: MemberRole;
  createdAt: string;
  subscription?: SubscriptionStatus;
  subscriptionPlan?: string;
  revoked?: boolean;
  suspended?: boolean;
};
