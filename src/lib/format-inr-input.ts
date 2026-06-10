/** Parse Indian-formatted currency string to number. */
export function parseInrInput(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return NaN;
  return Number(digits);
}

/** Format number as Indian currency display: 2499999 → ₹24,99,999 */
export function formatInrInput(value: string | number): string {
  const num = typeof value === "number" ? value : parseInrInput(value);
  if (!Number.isFinite(num) || num === 0) {
    const raw = typeof value === "string" ? value.replace(/[^\d]/g, "") : "";
    if (!raw) return "";
    return `₹${Number(raw).toLocaleString("en-IN")}`;
  }
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

/** onChange handler helper for INR input fields */
export function handleInrInputChange(
  raw: string,
  setter: (formatted: string) => void,
) {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) {
    setter("");
    return;
  }
  setter(`₹${Number(digits).toLocaleString("en-IN")}`);
}
