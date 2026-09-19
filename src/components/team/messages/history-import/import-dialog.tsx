"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { historyCopy } from "@/lib/history/copy";
import { useChatStore } from "@/store/chat-store";
import { useHistoryImportStore } from "@/store/history-import-store";
import { beginImport, pollJournal, resumeImport, stopImport } from "./import-controller";
import ImportStatus from "./import-status";

/**
 * Import history from the phone: explain, show the code, then report honestly
 * — messages first, media after, paused / expired / finished with the count of
 * files the phone did not have. Closing the dialog does not stop the import.
 */
export default function ImportDialog({ language }: { language?: string | null }) {
  const userId = useChatStore((s) => s.currentUserId);
  const { open, view, tick, otherTab, starting, startError, setOpen } = useHistoryImportStore();
  const [qr, setQr] = useState("");
  const t = (key: Parameters<typeof historyCopy>[1]) => historyCopy(language, key);
  const active = view && (view.status === "waiting" || view.status === "receiving" || view.status === "paused");

  useEffect(() => {
    if (!view?.qrPayload || view.status !== "waiting") return;
    let cancelled = false;
    void QRCode.toDataURL(view.qrPayload, { margin: 1, width: 320, errorCorrectionLevel: "M" }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [view?.qrPayload, view?.status]);

  useEffect(() => {
    if (!otherTab || !open) return;
    const timer = setInterval(() => void pollJournal(userId), 3000);
    return () => clearInterval(timer);
  }, [otherTab, open, userId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-left">
          <DialogTitle>{t("importTitle")}</DialogTitle>
          <DialogDescription className="leading-6">{t("importBody")}</DialogDescription>
        </DialogHeader>

        {view?.status === "waiting" && qr ? (
          <div className="mt-2 flex flex-col items-center">
            <p className="mb-3 text-sm text-[var(--sig-label)]">{t("scanTitle")}</p>
            <div className="flex size-[232px] items-center justify-center rounded-xl bg-white p-3">
              <Image alt="History transfer code" className="size-52" height={208} src={qr} unoptimized width={208} />
            </div>
            <p className="mt-4 font-mono text-2xl tracking-[0.3em] text-[var(--sig-label)]">{view.code}</p>
            <p className="mt-2 text-center text-xs text-[var(--sig-label-2)]">{t("scanHint")}</p>
          </div>
        ) : null}

        {view ? <ImportStatus view={view} tick={tick} language={language} /> : null}
        {otherTab ? <p className="text-sm text-[var(--sig-label-2)]">{t("otherTab")}</p> : null}
        {startError ? <p className="text-sm text-[var(--sig-danger)]">{startError === "active" ? t("otherTab") : startError}</p> : null}
        <p className="text-xs leading-5 text-[var(--sig-label-2)]">{t("storageWarning")}</p>

        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {active ? (
            <Button variant="outline" onClick={() => void stopImport(userId)}>
              {t("cancel")}
            </Button>
          ) : null}
          {view?.status === "paused" && !otherTab ? (
            <Button onClick={() => void resumeImport(userId, view.id)}>{t("resume")}</Button>
          ) : null}
          {!active ? (
            <Button
              disabled={starting || !userId}
              onClick={() => void (view?.status === "failed" ? resumeImport(userId, view.id) : beginImport(userId))}
            >
              {view && view.status !== "finished" ? t("retry") : t("importStart")}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
