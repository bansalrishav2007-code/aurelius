import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";

/** Matches fixed bar height (48px) — use as padding-top on page content below the bar. */
export const WEALTH_QUICK_ACTIONS_OFFSET_CLASS = "pt-12";

type WealthQuickActionsProps = {
  onAddAsset: () => void;
  onAddLiability: () => void;
  onUpload: () => void;
  onDownloadReport: () => void;
  isDemo?: boolean;
};

const btnBase: CSSProperties = {
  fontSize: 13,
  padding: "6px 14px",
  borderRadius: 6,
  border: "1px solid rgba(201, 168, 76, 0.4)",
  color: "#C9A84C",
  background: "transparent",
};

const btnClass =
  "shrink-0 inline-flex items-center gap-1.5 font-medium transition-colors hover:bg-[rgba(201,168,76,0.1)] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";

const askAiStyle: CSSProperties = {
  ...btnBase,
  background: "#C9A84C",
  color: "#0A0A0F",
  fontWeight: 600,
  border: "1px solid #C9A84C",
};

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={btnClass}
      style={btnBase}
    >
      <span aria-hidden className="text-[13px] leading-none">
        {icon}
      </span>
      {label}
    </button>
  );
}

function ActionDivider() {
  return (
    <div
      className="w-px shrink-0 self-stretch my-2.5"
      style={{ borderRight: "1px solid rgba(201, 168, 76, 0.2)" }}
      aria-hidden
    />
  );
}

export function WealthQuickActions({
  onAddAsset,
  onAddLiability,
  onUpload,
  onDownloadReport,
  isDemo,
}: WealthQuickActionsProps) {
  return (
    <div
      className="fixed top-16 left-0 right-0 lg:left-64 z-20 backdrop-blur-[10px]"
      style={{
        height: 48,
        background: "rgba(13, 20, 40, 0.95)",
        borderBottom: "1px solid rgba(201, 168, 76, 0.3)",
      }}
      role="toolbar"
      aria-label="Wealth quick actions"
    >
      <div className="flex h-full w-full items-center overflow-x-auto overflow-y-hidden scrollbar-none px-3 sm:px-4 lg:px-6 lg:justify-between">
        <div className="flex items-center shrink-0">
          <ActionButton icon="＋" label="Add Asset" onClick={onAddAsset} disabled={isDemo} />
          <ActionDivider />
          <ActionButton icon="＋" label="Add Liability" onClick={onAddLiability} disabled={isDemo} />
          <ActionDivider />
          <ActionButton icon="↑" label="Upload Document" onClick={onUpload} disabled={isDemo} />
        </div>

        <div className="hidden lg:block flex-1 min-w-6" aria-hidden />

        <div className="flex items-center shrink-0">
          <Link to="/dashboard/ai-advisor" className={btnClass} style={askAiStyle}>
            <span aria-hidden className="text-[13px] leading-none">
              ✦
            </span>
            Ask AI
          </Link>
          <ActionDivider />
          <ActionButton icon="↓" label="Download Report" onClick={onDownloadReport} />
        </div>
      </div>
    </div>
  );
}
