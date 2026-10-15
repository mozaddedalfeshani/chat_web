"use client";

import { Moon02Icon, Sun03Icon } from "hugeicons-react";
import { applyTheme, setStoredTheme, type Theme } from "@/lib/theme";

/** Flips the app theme; the icon follows data-theme through CSS, so no hydration flash. */
export default function ThemeToggle() {
  const toggle = () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next: Theme = current === "light" ? "dark" : "light";
    applyTheme(next);
    setStoredTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text)] hover:bg-[var(--surface2)]"
    >
      <Sun03Icon size={18} className="hidden [[data-theme=dark]_&]:block" />
      <Moon02Icon size={18} className="hidden [[data-theme=light]_&]:block" />
    </button>
  );
}
