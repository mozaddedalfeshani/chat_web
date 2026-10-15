import Link from "next/link";
import { ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react";
import { docHref, type DocPage } from "@/lib/docs";

type Props = { prev?: DocPage; next?: DocPage };

const ICON_BTN =
  "flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface2)] text-[var(--text)] transition-colors hover:bg-[var(--surface3)]";

/** The two arrow buttons beside the title. */
export function PagerIcons({ prev, next }: Props) {
  return (
    <>
      {prev ? (
        <Link href={docHref(prev.slug)} aria-label={`Previous: ${prev.title}`} className={ICON_BTN}>
          <ArrowLeft01Icon size={18} />
        </Link>
      ) : null}
      {next ? (
        <Link href={docHref(next.slug)} aria-label={`Next: ${next.title}`} className={ICON_BTN}>
          <ArrowRight01Icon size={18} />
        </Link>
      ) : null}
    </>
  );
}

/** The labelled pair at the end of the page. */
export function PagerFooter({ prev, next }: Props) {
  const card =
    "flex flex-col gap-1 rounded-xl border border-[var(--border)] px-4 py-3 transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--surface3)]";
  return (
    <nav aria-label="Pages" className="mt-16 grid gap-3 sm:grid-cols-2">
      {prev ? (
        <Link href={docHref(prev.slug)} className={card}>
          <span className="flex items-center gap-1 text-[13px] text-[var(--text-muted)]">
            <ArrowLeft01Icon size={14} aria-hidden /> Previous
          </span>
          <span className="text-[15px] font-medium">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={docHref(next.slug)} className={`${card} sm:items-end sm:text-right`}>
          <span className="flex items-center gap-1 text-[13px] text-[var(--text-muted)]">
            Next <ArrowRight01Icon size={14} aria-hidden />
          </span>
          <span className="text-[15px] font-medium">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
