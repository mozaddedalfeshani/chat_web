import Image from "next/image";
import Link from "next/link";
import { GithubIcon } from "hugeicons-react";
import { GITHUB_REPO_URL, PLAY_STORE_URL } from "@/lib/site";
import DocsMobileNav from "./docs-mobile-nav";
import ThemeToggle from "./theme-toggle";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Docs", href: "/docs" },
  { label: "Download", href: PLAY_STORE_URL, external: true },
];

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function DocsHeader() {
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1400px] items-center gap-4 px-4 md:px-6">
        <DocsMobileNav />
        <Link href="/docs" className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={24} height={24} />
          <span className="text-[15px] font-semibold tracking-tight">AbabilX Chat</span>
        </Link>
        <nav aria-label="Site" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              {...(item.external ? external : {})}
              className="rounded-lg px-3 py-1.5 text-[14px] font-medium text-[var(--text)]/80 transition-colors hover:text-[var(--text)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <a
            href={GITHUB_REPO_URL}
            {...external}
            aria-label="Source on GitHub"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text)] hover:bg-[var(--surface2)]"
          >
            <GithubIcon size={18} />
          </a>
          <ThemeToggle />
          <span aria-hidden className="mx-1 h-5 w-px bg-[var(--border)]" />
          <Link
            href="/"
            className="flex h-9 items-center rounded-lg bg-[var(--text)] px-3.5 text-[14px] font-medium text-[var(--bg)] transition-opacity hover:opacity-90"
          >
            Open chat
          </Link>
        </div>
      </div>
    </header>
  );
}
