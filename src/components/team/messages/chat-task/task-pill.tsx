"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown01Icon, Tick02Icon } from "hugeicons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type TaskPillOption<T extends string> = { value: T; label: string; color: string };

/** A capsule that opens a short list: the task card's two dropdowns. */
export default function TaskPill<T extends string>({
  caption,
  icon,
  value,
  options,
  disabled,
  onChange,
}: {
  /** "Priority" / "Status" — read out, and shown above the list. */
  caption: string;
  icon: ReactNode;
  value: T;
  options: TaskPillOption<T>[];
  disabled?: boolean;
  onChange: (next: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${caption}: ${current.label}`}
          className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
          style={{
            color: current.color,
            background: `color-mix(in srgb, ${current.color} 14%, transparent)`,
          }}
        >
          {icon}
          <span>{current.label}</span>
          <ArrowDown01Icon size={13} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 rounded-2xl p-1.5">
        <p className="px-2.5 pb-1 pt-1 text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
          {caption}
        </p>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="flex w-full items-center gap-2 rounded-full px-2.5 py-1.5 text-left text-[13px] font-medium hover:bg-[var(--sig-fill-strong)]"
            style={{ color: option.color }}
            onClick={() => {
              setOpen(false);
              if (option.value !== value) onChange(option.value);
            }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: option.color }} />
            <span className="flex-1">{option.label}</span>
            {option.value === value ? <Tick02Icon size={14} /> : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
