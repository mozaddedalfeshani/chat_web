import Link from "next/link";
import { Alert02Icon, ArrowUpRight01Icon, InformationCircleIcon } from "hugeicons-react";
import type { DocBlock } from "@/lib/docs";

const TEXT = "text-[16px] leading-7 text-[var(--text)]/90";

function Callout({ block }: { block: Extract<DocBlock, { type: "callout" }> }) {
  const warn = block.tone === "warn";
  const Icon = warn ? Alert02Icon : InformationCircleIcon;
  return (
    <div
      className={`flex gap-3 rounded-xl border px-5 py-4 ${
        warn
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-[#e11d48]/40 bg-[#e11d48]/10"
      }`}
    >
      <Icon
        size={18}
        aria-hidden
        className={`mt-1 shrink-0 ${warn ? "text-amber-500" : "text-[#e11d48]"}`}
      />
      <p className="text-[15px] leading-7 text-[var(--text)]">
        {block.title ? <strong className="font-semibold">{block.title} </strong> : null}
        {block.text}
      </p>
    </div>
  );
}

function Cards({ block }: { block: Extract<DocBlock, { type: "cards" }> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {block.items.map((card) => {
        const body = (
          <>
            <span className="flex items-center justify-between gap-2 text-[15px] font-medium text-[var(--text)]">
              {card.title}
              {card.href ? (
                <ArrowUpRight01Icon
                  size={16}
                  aria-hidden
                  className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--text)]"
                />
              ) : null}
            </span>
            <span className="mt-2 block text-[14px] leading-6 text-[var(--text-muted)]">
              {card.text}
            </span>
          </>
        );
        const cls =
          "group block rounded-2xl bg-[var(--surface2)] p-5 transition-colors hover:bg-[var(--surface3)] ring-1 ring-transparent hover:ring-[var(--border-hover)]";
        if (!card.href) return <div key={card.title} className={cls}>{body}</div>;
        return card.href.startsWith("http") ? (
          <a key={card.title} href={card.href} target="_blank" rel="noopener noreferrer" className={cls}>
            {body}
          </a>
        ) : (
          <Link key={card.title} href={card.href} className={cls}>
            {body}
          </Link>
        );
      })}
    </div>
  );
}

export function DocBlockView({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "p":
      return <p className={TEXT}>{block.text}</p>;
    case "list":
      return (
        <ul className={`list-disc space-y-2 pl-6 marker:text-[var(--text-muted)] ${TEXT}`}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="space-y-4">
          {block.items.map((item, i) => (
            <li key={item} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface2)] text-[13px] font-semibold text-[var(--text)]">
                {i + 1}
              </span>
              <span className={TEXT}>{item}</span>
            </li>
          ))}
        </ol>
      );
    case "callout":
      return <Callout block={block} />;
    case "cards":
      return <Cards block={block} />;
  }
}

export function DocBlocks({ blocks }: { blocks: DocBlock[] }) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, i) => (
        <DocBlockView key={i} block={block} />
      ))}
    </div>
  );
}
