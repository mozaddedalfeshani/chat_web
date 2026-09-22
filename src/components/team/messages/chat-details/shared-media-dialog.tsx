"use client";

import { useEffect, useState } from "react";
import { FileText, ImageIcon } from "lucide-react";
import { api, type ChatMessageAttachment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MediaKind = "media" | "files";

export default function SharedMediaDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [kind, setKind] = useState<MediaKind>("media");
  const [result, setResult] = useState<{
    key: string;
    items: ChatMessageAttachment[];
  }>({ key: "", items: [] });
  const requestKey = open ? `${conversationId}:${kind}` : "";
  const items = result.key === requestKey ? result.items : [];
  const loading = open && result.key !== requestKey;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api
      .listChatConversationMedia(conversationId, { kind })
      .then((page) => {
        if (!cancelled) setResult({ key: requestKey, items: page.items ?? [] });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, kind, open, requestKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Shared media</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={kind === "media" ? "default" : "secondary"}
            onClick={() => setKind("media")}
          >
            <ImageIcon className="mr-1 size-4" /> Media
          </Button>
          <Button
            size="sm"
            variant={kind === "files" ? "default" : "secondary"}
            onClick={() => setKind("files")}
          >
            <FileText className="mr-1 size-4" /> Files
          </Button>
        </div>
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nothing shared yet.
          </p>
        ) : kind === "media" ? (
          <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.file_url}
                target="_blank"
                rel="noreferrer"
                className="aspect-square overflow-hidden rounded-lg bg-[var(--surface2)]"
              >
                {item.content_type.startsWith("video/") ? (
                  <video src={item.file_url} className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.file_url}
                    alt={item.file_name}
                    className="h-full w-full object-cover"
                  />
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface2)]"
              >
                <FileText className="size-4 shrink-0" />
                <span className="truncate">{item.file_name}</span>
              </a>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
