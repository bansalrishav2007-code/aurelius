const GENERIC_LIABILITY_NAMES = new Set([
  "loan",
  "loans",
  "liability",
  "liabilities",
  "debt",
  "debts",
  "mortgage",
  "credit",
  "credit card",
  "other",
  "unnamed",
  "new liability",
  "new",
  "test",
  "n/a",
  "na",
  "none",
  "default",
  "outstanding",
  "balance",
]);

export function validateLiabilityName(name: string): { ok: true } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Liability name is required." };
  }
  if (trimmed.length < 3) {
    return { ok: false, error: "Enter a specific liability name (at least 3 characters)." };
  }
  if (/^\d+$/.test(trimmed)) {
    return { ok: false, error: "Liability name cannot be only numbers." };
  }
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  if (GENERIC_LIABILITY_NAMES.has(normalized)) {
    return { ok: false, error: "Use a specific name (e.g. “Home loan — HDFC”, not “Loan”)." };
  }
  return { ok: true };
}
