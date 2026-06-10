import { useRef } from "react";
import { cn } from "@/lib/utils";
import { formatInviteDisplay, INVITE_CODE_LENGTH } from "@/lib/auth/invite-code";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export { formatInviteDisplay };

export function InviteCodeInput({ value, onChange, disabled, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = formatInviteDisplay(value);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.focus()}
      className={cn(
        "w-full text-left panel-elevated rounded-2xl px-6 py-5 transition-all duration-500 focus-within:ring-1 focus-within:ring-gold/40",
        className,
      )}
    >
      <p className="label-caps mb-3">Invitation code</p>
      <div className="relative">
        <input
          ref={inputRef}
          value={display}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, INVITE_CODE_LENGTH));
          }}
          placeholder="AURE-XXXX-XXXX"
          className="w-full bg-transparent font-display text-2xl md:text-3xl tracking-[0.12em] uppercase focus:outline-none placeholder:text-muted-foreground/30"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="characters"
        />
      </div>
    </button>
  );
}
