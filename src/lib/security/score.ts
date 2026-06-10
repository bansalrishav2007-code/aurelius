import type { SecurityProfile, SecurityScore, TrustedDevice } from "./types";

export function computeSecurityScore(
  profile: SecurityProfile,
  trustedDevices: TrustedDevice[],
): SecurityScore {
  const items: SecurityScore["items"] = [];
  let total = 0;

  const has2fa = profile.twoFactorEnabled;
  if (has2fa) {
    items.push({ label: "2FA enabled", points: 30, earned: true });
    total += 30;
  } else {
    items.push({ label: "2FA enabled", points: 30, earned: false, warning: true });
  }

  const hasPassword = Boolean(profile.passwordChangedAt) || has2fa;
  if (hasPassword) {
    items.push({ label: "Strong password", points: 20, earned: true });
    total += 20;
  } else {
    items.push({ label: "Strong password", points: 20, earned: false });
    total += 10;
  }

  if (profile.authenticatorTwoFactorEnabled) {
    items.push({ label: "Authenticator app", points: 10, earned: true });
    total += 10;
  } else {
    items.push({ label: "No authenticator app", points: 10, earned: false, warning: true });
  }

  const reviewedRecently =
    profile.loginHistoryReviewedAt &&
    Date.now() - new Date(profile.loginHistoryReviewedAt).getTime() < 30 * 86_400_000;
  if (reviewedRecently) {
    items.push({ label: "Login history reviewed", points: 5, earned: true });
    total += 5;
  } else {
    items.push({ label: "Login history not reviewed", points: 5, earned: false, warning: true });
  }

  if (trustedDevices.length > 0) {
    items.push({ label: "Trusted device set", points: 15, earned: true });
    total += 15;
  } else {
    items.push({ label: "Trusted device set", points: 15, earned: false });
  }

  items.push({ label: "Data residency India", points: 20, earned: true });
  total += 20;

  const tips: string[] = [];
  if (!profile.authenticatorTwoFactorEnabled) tips.push("Set up authenticator app");
  if (!reviewedRecently) tips.push("Review login history monthly");
  if (!has2fa) tips.push("Enable two-factor authentication");
  if (!trustedDevices.length) tips.push("Trust your primary device for smoother sign-in");

  let band: SecurityScore["band"] = "WEAK";
  if (total >= 90) band = "EXCELLENT";
  else if (total >= 70) band = "GOOD";
  else if (total >= 50) band = "FAIR";

  return { total: Math.min(100, total), band, items, tips };
}
