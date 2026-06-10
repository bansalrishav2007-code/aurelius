import { handleInrInputChange, parseInrInput } from "@/lib/format-inr-input";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onValueChange?: (amount: number) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
};

export function InrInput({
  label,
  value,
  onChange,
  onValueChange,
  placeholder = "₹0",
  required,
  className = "field-input mt-1 tabular-nums",
  id,
}: Props) {
  function handleChange(raw: string) {
    handleInrInputChange(raw, (formatted) => {
      onChange(formatted);
      onValueChange?.(parseInrInput(formatted));
    });
  }

  const field = (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );

  if (!label) return field;

  return (
    <label className="block">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {field}
    </label>
  );
}
