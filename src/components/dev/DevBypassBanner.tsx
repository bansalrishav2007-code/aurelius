import { FlaskConical } from "lucide-react";

export function DevBypassBanner() {
  return (
    <div className="mx-4 lg:mx-8 mt-4 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-2.5 flex items-center gap-2.5 text-[12px] text-amber-100/90">
      <FlaskConical className="h-3.5 w-3.5 shrink-0 text-amber-300" strokeWidth={1.5} />
      <p>
        <span className="font-medium text-amber-100">Dev bypass active</span>
        <span className="text-amber-100/75"> — OTP skipped for testing. Remove before production launch.</span>
      </p>
    </div>
  );
}
