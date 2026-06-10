import { useEffect, useRef } from "react";

type OtpDigitInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
};

export function OtpDigitInput({
  value,
  onChange,
  onComplete,
  disabled,
  error,
  success,
}: OtpDigitInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (value.length === 6) onComplete?.(value);
  }, [value, onComplete]);

  function focusIndex(index: number) {
    const el = inputsRef.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  }

  function updateDigit(index: number, char: string) {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join("").slice(0, 6));
  }

  function handleChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      updateDigit(index, "");
      return;
    }

    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6);
      onChange(pasted);
      focusIndex(Math.min(pasted.length, 5));
      return;
    }

    updateDigit(index, cleaned[0]!);
    if (index < 5) focusIndex(index + 1);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusIndex(index - 1);
    }
    if (e.key === "ArrowLeft" && index > 0) focusIndex(index - 1);
    if (e.key === "ArrowRight" && index < 5) focusIndex(index + 1);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    focusIndex(Math.min(pasted.length, 5));
  }

  const borderClass = error
    ? "border-destructive/70 focus:border-destructive"
    : success
      ? "border-success/70 focus:border-success"
      : "border-border focus:border-gold/60";

  return (
    <div className={`flex gap-2 sm:gap-3 justify-center ${error ? "animate-otp-shake" : ""}`}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={6}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${index + 1}`}
          className={`h-12 w-10 sm:h-14 sm:w-12 rounded-xl bg-background/60 text-center text-xl sm:text-2xl font-mono tracking-widest border ${borderClass} outline-none transition-colors`}
        />
      ))}
    </div>
  );
}
