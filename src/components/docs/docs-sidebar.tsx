"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_GROUPS, docHref } from "@/lib/docs";

type Props = {
  /** Lets the mobile drawer close itself when a page is picked. */
  onNavigate?: () => void;
};

export default function DocsSidebar({ onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label="Docs" className="flex flex-col gap-7 pb-10">
      {DOC_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[13px] font-medium text-[var(--text-muted)]">
            {group.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.pages.map((page) => {
              const href = docHref(page.slug);
              const active = pathname === href;
              return (
                <li key={page.slug}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-[14px] font-medium transition-colors ${
                      active
                        ? "bg-[var(--surface2)] text-[var(--text)]"
                        : "text-[var(--text)]/80 hover:bg-[var(--surface3)] hover:text-[var(--text)]"
                    }`}
                  >
                    {page.title}
                    {page.androidOnly ? (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e11d48]/70"
                        title="Android app"
                        aria-label="Android app"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
