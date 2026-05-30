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

export type WaitlistApplication = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  profession: string;
  netWorthBand?: string;
  whyAccess: string;
  status: WaitlistStatus;
  createdAt: string;
  reviewedAt?: string;
  inviteCodeId?: string;
  inviteCode?: string;
  invitationSentAt?: string;
};

export type SubscriptionStatus = "none" | "active" | "past_due" | "cancelled";

export type MemberRole = "member" | "SUPER_ADMIN";

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
};

export type AdminSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
};

export type AuthStore = {
  invites: InviteCode[];
  waitlist: WaitlistApplication[];
  members: MemberSession[];
  admins: AdminSession[];
};

export type PublicSession = {
  email: string;
  fullName: string;
  tier: InviteCode["tier"];
  role?: MemberRole;
  subscription?: SubscriptionStatus;
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
};
