"use client";

import { useEffect, useState } from "react";
import { Cancel01Icon, Menu01Icon } from "hugeicons-react";
import DocsSidebar from "./docs-sidebar";

/** Below md the sidebar becomes a drawer under the header. */
export default function DocsMobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text)] hover:bg-[var(--surface2)] md:hidden"
      >
        {open ? <Cancel01Icon size={20} /> : <Menu01Icon size={20} />}
      </button>
      {open ? (
        <div className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto bg-[var(--bg)] px-4 pt-6 md:hidden">
          <DocsSidebar onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </>
  );
}
