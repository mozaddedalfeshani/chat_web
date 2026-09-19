import { create } from "zustand";
import type { ImportJob } from "@/lib/history/transfer/jobs";

/**
 * What the import dialog shows. A snapshot of the durable journal
 * (`lib/history/transfer/jobs.ts`), never the source of truth: a reload
 * rebuilds it from IndexedDB, and another tab running the import feeds it by
 * polling that same journal.
 */
export type ImportView = Pick<
  ImportJob,
  "id" | "status" | "pauseReason" | "code" | "qrPayload" | "counts" | "inventory" | "error" | "expiresAt"
> & {
  messagesDone: boolean;
  batchesDone: number;
};

export type ImportTickView = { batch: number; held: number; chunks: number; kind: string } | null;

type HistoryImportState = {
  open: boolean;
  view: ImportView | null;
  tick: ImportTickView;
  otherTab: boolean;
  starting: boolean;
  startError: string;
  setOpen: (open: boolean) => void;
  setView: (view: ImportView | null) => void;
  setTick: (tick: ImportTickView) => void;
  setOtherTab: (value: boolean) => void;
  setStarting: (value: boolean, error?: string) => void;
};

export const useHistoryImportStore = create<HistoryImportState>((set) => ({
  open: false,
  view: null,
  tick: null,
  otherTab: false,
  starting: false,
  startError: "",
  setOpen: (open) => set({ open }),
  setView: (view) => set({ view }),
  setTick: (tick) => set({ tick }),
  setOtherTab: (otherTab) => set({ otherTab }),
  setStarting: (starting, startError = "") => set({ starting, startError }),
}));

export function viewOf(job: ImportJob): ImportView {
  const batches = Object.values(job.batches);
  const committed = batches.filter((b) => b.state === "committed");
  const media = batches.some((b) => b.kind === "media");
  const messagesPending = batches.some((b) => b.kind === "messages" && b.state !== "committed");
  return {
    id: job.id,
    status: job.status,
    pauseReason: job.pauseReason,
    code: job.code,
    qrPayload: job.qrPayload,
    counts: job.counts,
    inventory: job.inventory,
    error: job.error,
    expiresAt: job.expiresAt,
    messagesDone: committed.length > 0 && !messagesPending && (media || job.status === "finished"),
    batchesDone: committed.length,
  };
}
