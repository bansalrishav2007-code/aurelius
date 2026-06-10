export type LoginStatus = "success" | "failed" | "suspicious";

export type SecuritySession = {
  id: string;
  memberEmail: string;
  deviceName: string;
  browser: string;
  browserVersion?: string;
  location: string;
  createdAt: string;
  lastActive: string;
  current?: boolean;
  authSessionId?: string;
};

export type TrustedDevice = {
  id: string;
  memberEmail: string;
  deviceName: string;
  browser: string;
  location: string;
  trustedAt: string;
  skipOtpUntil?: string;
};

export type LoginHistoryEntry = {
  id: string;
  memberEmail: string;
  deviceName: string;
  browser: string;
  location: string;
  status: LoginStatus;
  success: boolean;
  ipAddress: string;
  deviceId?: string;
  createdAt: string;
};

export type SuspiciousLoginAlert = {
  id: string;
  deviceName: string;
  browser: string;
  location: string;
  ipAddress: string;
  createdAt: string;
};

export type SecurityNotificationPrefs = {
  loginNewDevice: boolean;
  failedLogin: boolean;
  advanceTax: boolean;
  marketMovement: boolean;
  sgbIssuance: boolean;
  rebalancing: boolean;
  documentExpiry: boolean;
  expertMessage: boolean;
  channel: "sms" | "email" | "both";
};

export const DEFAULT_SECURITY_NOTIFICATION_PREFS: SecurityNotificationPrefs = {
  loginNewDevice: true,
  failedLogin: true,
  advanceTax: true,
  marketMovement: false,
  sgbIssuance: true,
  rebalancing: true,
  documentExpiry: true,
  expertMessage: true,
  channel: "both",
};

export type SecurityProfile = {
  memberEmail: string;
  twoFactorEnabled: boolean;
  twoFactorMethod?: "sms" | "authenticator";
  smsTwoFactorEnabled?: boolean;
  authenticatorTwoFactorEnabled?: boolean;
  totpSecret?: string;
  totpPendingSecret?: string;
  backupCodes?: string[];
  registeredMobile?: string;
  loginHistoryReviewedAt?: string;
  passwordChangedAt?: string;
  emergencyLocked?: boolean;
  emergencyLockedAt?: string;
  emergencyUnlockToken?: string;
  pendingSuspiciousLogin?: SuspiciousLoginAlert | null;
  notificationPrefs?: SecurityNotificationPrefs;
  deletionRequestedAt?: string;
  deletionConfirmToken?: string;
  deletionConfirmSentAt?: string;
  deletionConfirmedAt?: string;
  updatedAt: string;
};

export type SecurityStore = {
  sessions: SecuritySession[];
  trustedDevices: TrustedDevice[];
  loginHistory: LoginHistoryEntry[];
  profiles: SecurityProfile[];
};

export type SecurityScoreItem = {
  label: string;
  points: number;
  earned: boolean;
  warning?: boolean;
};

export type SecurityScore = {
  total: number;
  band: "EXCELLENT" | "GOOD" | "FAIR" | "WEAK";
  items: SecurityScoreItem[];
  tips: string[];
};

export type ApiAccessEntry = {
  id: string;
  feature: string;
  detail: string;
  accessedAt: string;
};

export type SecurityDashboard = {
  profile: SecurityProfile;
  sessions: SecuritySession[];
  trustedDevices: TrustedDevice[];
  loginHistory: LoginHistoryEntry[];
  recentFailedAttempts: number;
  consecutiveFailedAttempts: number;
  suspiciousLogin?: SuspiciousLoginAlert | null;
  securityScore: SecurityScore;
  apiAccessLog: ApiAccessEntry[];
  notificationPrefs: SecurityNotificationPrefs;
  updatedAt: string;
};
