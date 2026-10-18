"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search01Icon } from "hugeicons-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { searchDocs } from "@/lib/docs/search";

/** Header search: ⌘K, Ctrl+K or "/" opens it; arrows move, Enter opens. */
export default function DocsSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const hits = useMemo(() => searchDocs(query), [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && hits[active]) go(hits[active].href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search docs"
        className="flex h-9 items-center gap-2 rounded-lg bg-[var(--surface2)] px-3 text-[14px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface3)] sm:w-56 lg:w-72"
      >
        <Search01Icon size={16} aria-hidden />
        <span className="hidden sm:inline">Search docs…</span>
        <kbd className="ml-auto hidden rounded border border-[var(--border)] px-1.5 text-[11px] sm:inline">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[12vh] max-w-xl translate-y-0 gap-0 p-0">
          <DialogTitle className="sr-only">Search docs</DialogTitle>
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4">
            <Search01Icon size={18} aria-hidden className="text-[var(--text-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onInputKey}
              placeholder="Search: webhook, 429, backup, privacy…"
              aria-label="Search docs"
              className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <ul role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
            {query && !hits.length ? (
              <li className="px-3 py-6 text-center text-[14px] text-[var(--text-muted)]">No results for “{query}”</li>
            ) : null}
            {hits.map((h, i) => (
              <li key={h.href} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(h.href)}
                  className={`block w-full rounded-lg px-3 py-2 text-left ${i === active ? "bg-[var(--surface2)]" : ""}`}
                >
                  <span className="block text-[12px] text-[var(--text-muted)]">{h.page}</span>
                  <span className="block text-[14px] font-medium">{h.heading}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] text-[var(--text-muted)]">{h.snippet}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
