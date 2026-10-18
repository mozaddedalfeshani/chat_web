import { AndroidIcon } from "hugeicons-react";
import DocJsonLd from "@/components/seo/doc-json-ld";
import { docMarkdownHref, docNeighbours, type DocPage } from "@/lib/docs";
import { docToMarkdown } from "@/lib/docs/markdown";
import CopyPageButton from "./copy-page-button";
import { DocBlocks } from "./docs-blocks";
import { PagerFooter, PagerIcons } from "./docs-pager";

export default function DocsArticle({ page }: { page: DocPage }) {
  const { prev, next } = docNeighbours(page.slug);

  return (
    <div className="flex gap-12 px-4 py-10 md:px-10 lg:py-14 xl:px-16">
      <DocJsonLd page={page} />
      <article className="mx-auto w-full min-w-0 max-w-[760px]">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">
            {page.title}
          </h1>
          <div className="flex shrink-0 items-center gap-2 sm:mt-2">
            <CopyPageButton markdown={docToMarkdown(page)} />
            <a
              href={docMarkdownHref(page.slug)}
              title="This page as plain Markdown, for AI tools"
              className="flex h-9 items-center rounded-lg bg-[var(--surface2)] px-3 text-[14px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface3)]"
            >
              .md
            </a>
            <PagerIcons prev={prev} next={next} />
          </div>
        </header>
        <p className="mt-3 text-[17px] leading-7 text-[var(--text-muted)]">{page.description}</p>
        {page.updated ? (
          <p className="mt-2 text-[13px] text-[var(--text-muted)]">
            Last updated <time dateTime={page.updated}>{page.updated}</time>
          </p>
        ) : null}
        {page.androidOnly ? (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-[13px] font-medium text-[var(--text-muted)]">
            <AndroidIcon size={14} aria-hidden />
            Android app only, for now
          </p>
        ) : null}

        {page.intro ? (
          <div className="mt-8">
            <DocBlocks blocks={page.intro} />
          </div>
        ) : null}

        {page.sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id} className="mt-12">
            <h2 id={section.id} className="mb-5 scroll-mt-24 text-[24px] font-semibold tracking-tight">
              {section.heading}
            </h2>
            <DocBlocks blocks={section.blocks} />
          </section>
        ))}

        <PagerFooter prev={prev} next={next} />
      </article>

      <aside className="sticky top-24 hidden h-fit w-52 shrink-0 xl:block">
        <p className="mb-3 text-[13px] font-medium text-[var(--text-muted)]">On this page</p>
        <ul className="flex flex-col gap-2 text-[14px]">
          {page.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-[var(--text)]/70 transition-colors hover:text-[var(--text)]">
                {s.heading}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
