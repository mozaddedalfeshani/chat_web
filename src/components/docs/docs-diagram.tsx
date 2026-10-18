import { ArrowDown01Icon } from "hugeicons-react";
import type { DocBlock } from "@/lib/docs";
import type { FlowNode, FlowWhere } from "@/lib/docs/types";

type FlowBlock = Extract<DocBlock, { type: "flow" }>;
type TableBlock = Extract<DocBlock, { type: "table" }>;

const WHERE: Record<FlowWhere, { label: string; chip: string; bar: string }> = {
  you: { label: "Your device", chip: "bg-[#e11d48]/15 text-[#e11d48]", bar: "bg-[#e11d48]" },
  server: { label: "Our server", chip: "bg-amber-500/15 text-amber-500", bar: "bg-amber-500" },
  them: { label: "Their device", chip: "bg-sky-500/15 text-sky-500", bar: "bg-sky-500" },
  new: { label: "New device", chip: "bg-emerald-500/15 text-emerald-500", bar: "bg-emerald-500" },
  app: { label: "Your app", chip: "bg-violet-500/15 text-violet-500", bar: "bg-violet-500" },
};

function Arrow() {
  return (
    <div aria-hidden className="flex flex-col items-center text-[var(--text-muted)]">
      <span className="h-3 w-px bg-[var(--border-hover)]" />
      <ArrowDown01Icon size={16} />
    </div>
  );
}

function Node({ node }: { node: FlowNode }) {
  const where = node.where ? WHERE[node.where] : null;
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface2)] py-3 pl-5 pr-4">
      {where ? <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${where.bar}`} /> : null}
      {where ? (
        <span className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${where.chip}`}>
          {where.label}
        </span>
      ) : null}
      <p className="text-[15px] font-semibold leading-6 text-[var(--text)]">{node.title}</p>
      {node.text ? (
        <p className="mt-1 text-[14px] leading-6 text-[var(--text-muted)]">{node.text}</p>
      ) : null}
    </div>
  );
}

function Chain({ steps }: { steps: FlowNode[] }) {
  return (
    <div className="flex flex-col items-center">
      {steps.map((node, i) => (
        <div key={node.title} className="flex w-full flex-col items-center">
          {i > 0 ? <Arrow /> : null}
          <Node node={node} />
        </div>
      ))}
    </div>
  );
}

const COLS: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

export function DocFlow({ block }: { block: FlowBlock }) {
  return (
    <figure className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        {block.steps.map((step, i) => (
          <div key={i} className="flex w-full flex-col items-center">
            {i > 0 ? <Arrow /> : null}
            {"branches" in step ? (
              <div className={`grid w-full gap-4 ${COLS[step.branches.length] ?? ""}`}>
                {step.branches.map((branch) => (
                  <div
                    key={branch.label}
                    className="rounded-xl border border-dashed border-[var(--border-hover)] p-3"
                  >
                    <p className="mb-3 text-center text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {branch.label}
                    </p>
                    <Chain steps={branch.steps} />
                  </div>
                ))}
              </div>
            ) : (
              <Node node={step} />
            )}
          </div>
        ))}
      </div>
      {block.caption ? (
        <figcaption className="mt-4 text-center text-[13px] leading-5 text-[var(--text-muted)]">
          {block.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function DocTable({ block }: { block: TableBlock }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full min-w-[34rem] border-collapse text-left text-[14px] leading-6">
        <thead className="bg-[var(--surface2)] text-[var(--text)]">
          <tr>
            {block.head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row[0]} className="border-t border-[var(--border)] align-top">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={`px-4 py-3 ${i === 0 ? "font-medium text-[var(--text)]" : "text-[var(--text-muted)]"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
