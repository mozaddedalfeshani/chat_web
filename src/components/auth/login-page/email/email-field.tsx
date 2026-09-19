"use client";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  inputMode?: "numeric" | "email" | "text";
  maxLength?: number;
  disabled?: boolean;
};

/** One labelled input in the login page's own palette. */
export default function EmailField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  disabled,
}: Props) {
  return (
    <label className="flex w-full flex-col gap-1 text-left">
      <span className="text-[12px] font-medium text-[#667781]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-[#d1d7db] bg-white px-3 text-[14px] text-[#111b21] outline-none focus:border-[#25d366] disabled:opacity-60"
      />
    </label>
  );
}
